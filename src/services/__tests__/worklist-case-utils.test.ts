import { describe, it, expect } from 'vitest';
import {
  isPlainFilterObject,
  buildHmisSyncPayload,
  buildWorklistQueryParams,
} from '@/hooks/worklist-case-utils';

describe('worklist-case-utils', () => {
  describe('isPlainFilterObject', () => {
    it('accepts plain javascript objects', () => {
      expect(isPlainFilterObject({})).toBe(true);
      expect(isPlainFilterObject({ modality: 'CT', perPage: 25 })).toBe(true);
      expect(isPlainFilterObject(Object.create(null))).toBe(true);
    });

    it('rejects null, undefined, primitives, arrays, and functions', () => {
      expect(isPlainFilterObject(null)).toBe(false);
      expect(isPlainFilterObject(undefined)).toBe(false);
      expect(isPlainFilterObject('hello')).toBe(false);
      expect(isPlainFilterObject(123)).toBe(false);
      expect(isPlainFilterObject(true)).toBe(false);
      expect(isPlainFilterObject([1, 2, 3])).toBe(false);
      expect(isPlainFilterObject(() => {})).toBe(false);
    });

    it('rejects React SyntheticEvent and DOM-like event objects', () => {
      const syntheticEvent = {
        _reactName: 'onClick',
        type: 'click',
        target: { tagName: 'SPAN', nodeType: 1 },
        currentTarget: { tagName: 'BUTTON', nodeType: 1 },
        nativeEvent: {},
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      expect(isPlainFilterObject(syntheticEvent)).toBe(false);

      const domNode = {
        nodeType: 1,
        tagName: 'DIV',
      };
      expect(isPlainFilterObject(domNode)).toBe(false);
    });
  });

  describe('buildHmisSyncPayload', () => {
    it('constructs default sync payload safely', () => {
      const payload = buildHmisSyncPayload({
        modalityFilter: 'all',
        departmentFilter: 'all',
      });

      expect(payload).toEqual({
        perPage: 50,
        fetchAllPages: true,
        maxPages: 5,
      });
      expect(() => JSON.stringify(payload)).not.toThrow();
    });

    it('applies modality and department filters when not "all"', () => {
      const payload = buildHmisSyncPayload({
        modalityFilter: 'CT',
        departmentFilter: 'er',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      expect(payload).toMatchObject({
        modality: 'CT',
        department: 'er',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });
    });

    it('infers search query type correctly', () => {
      // 14 digits -> MRN
      const mrnPayload = buildHmisSyncPayload({
        modalityFilter: 'all',
        departmentFilter: 'all',
        searchQuery: '19202612345678',
      });
      expect(mrnPayload.mrn).toBe('19202612345678');

      // 10 digits -> Accession
      const accPayload = buildHmisSyncPayload({
        modalityFilter: 'all',
        departmentFilter: 'all',
        searchQuery: '1926101234',
      });
      expect(accPayload.accession).toBe('1926101234');

      // Clamps month range to max 30 days for 31-day months (HMIS constraint)
      const augPayload = buildHmisSyncPayload({
        modalityFilter: 'all',
        departmentFilter: 'all',
        searchQuery: '192608001234',
      });
      expect(augPayload.startDate).toBe('2026-08-01');
      expect(augPayload.endDate).toBe('2026-08-30'); // Clamped to 30 days

      // Alpha characters -> Name
      const namePayload = buildHmisSyncPayload({
        modalityFilter: 'all',
        departmentFilter: 'all',
        searchQuery: 'Jane Doe',
      });
      expect(namePayload.name).toBe('Jane Doe');
    });

    it('merges valid plain custom filters', () => {
      const payload = buildHmisSyncPayload(
        { modalityFilter: 'all', departmentFilter: 'all' },
        { perPage: 25, maxPages: 2, subCategory: 'Diagnostic' }
      );

      expect(payload.perPage).toBe(25);
      expect(payload.maxPages).toBe(2);
      expect(payload.subCategory).toBe('Diagnostic');
    });

    it('ignores circular structures and React SyntheticEvents without throwing in JSON.stringify', () => {
      // Circular structure simulating React Fiber / DOM Element attached to event
      const circularEvent: any = {
        _reactName: 'onClick',
        bubbles: true,
        target: {
          tagName: 'SPAN',
        },
      };
      // Introduce circular reference
      circularEvent.target.stateNode = circularEvent;

      const payload = buildHmisSyncPayload(
        { modalityFilter: 'all', departmentFilter: 'all' },
        circularEvent
      );

      // Verify no circular references were merged
      expect(payload.target).toBeUndefined();
      expect(payload._reactName).toBeUndefined();

      // Must be safely JSON-stringifiable
      const serialized = JSON.stringify(payload);
      expect(typeof serialized).toBe('string');
      expect(JSON.parse(serialized)).toEqual({
        perPage: 50,
        fetchAllPages: true,
        maxPages: 5,
      });
    });
  });

  describe('buildWorklistQueryParams', () => {
    it('builds standard query parameters', () => {
      const params = buildWorklistQueryParams({
        searchQuery: 'ACC-123',
        statusFilter: 'draft',
        modalityFilter: 'CT',
        priorityFilter: 'stat',
        sourceFilter: 'pacs',
        departmentFilter: 'er',
        advancedFilters: {
          dateRange: 'today',
          dateFrom: '2026-10-01',
          dateTo: '2026-10-05',
          bodyPart: 'Chest',
          gender: 'Female',
          source: 'all',
          sortBy: 'date_desc',
          criticalOnly: true,
        },
        tabFilter: 'my_cases',
        sortField: 'accession',
        sortDirection: 'asc',
        pageSize: 50,
        currentPage: 2,
      });

      expect(params.get('query')).toBe('ACC-123');
      expect(params.get('status')).toBe('draft');
      expect(params.get('modality')).toBe('CT');
      expect(params.get('priority')).toBe('stat');
      expect(params.get('source')).toBe('pacs');
      expect(params.get('department')).toBe('er');
      expect(params.get('dateRange')).toBe('today');
      expect(params.get('dateFrom')).toBe('2026-10-01');
      expect(params.get('dateTo')).toBe('2026-10-05');
      expect(params.get('bodyPart')).toBe('Chest');
      expect(params.get('gender')).toBe('Female');
      expect(params.get('criticalOnly')).toBe('true');
      expect(params.get('assignedTo')).toBe('me');
      expect(params.get('sortBy')).toBe('accession_asc');
      expect(params.get('limit')).toBe('50');
      expect(params.get('page')).toBe('2');
    });

    it('bypasses dateRange constraint and sets dateRange=all for specific numeric accessions and MRNs', () => {
      // Accession lookup (12 digits)
      const accParams = buildWorklistQueryParams({
        searchQuery: '192609003949',
        statusFilter: 'all',
        modalityFilter: 'MRI',
        priorityFilter: 'all',
        sourceFilter: 'all',
        departmentFilter: 'all',
        advancedFilters: {
          dateRange: 'shift', // User has active 48h shift filter selected
          dateFrom: '',
          dateTo: '',
          bodyPart: 'all',
          gender: 'all',
          source: 'all',
          sortBy: 'date_desc',
          criticalOnly: false,
        },
        tabFilter: 'all',
        sortField: 'date',
        sortDirection: 'desc',
        pageSize: 25,
        currentPage: 1,
      });

      // Crucial: Must be 'all' so historical cases in local database are not filtered out by active shift
      expect(accParams.get('dateRange')).toBe('all');
      expect(accParams.get('query')).toBe('192609003949');

      // MRN lookup (14 digits)
      const mrnParams = buildWorklistQueryParams({
        searchQuery: '26202652168140',
        statusFilter: 'all',
        modalityFilter: 'all',
        priorityFilter: 'all',
        sourceFilter: 'all',
        departmentFilter: 'all',
        advancedFilters: {
          dateRange: 'shift',
          dateFrom: '',
          dateTo: '',
          bodyPart: 'all',
          gender: 'all',
          source: 'all',
          sortBy: 'date_desc',
          criticalOnly: false,
        },
        tabFilter: 'all',
        sortField: 'date',
        sortDirection: 'desc',
        pageSize: 25,
        currentPage: 1,
      });
      expect(mrnParams.get('dateRange')).toBe('all');
      expect(mrnParams.get('query')).toBe('26202652168140');
    });
  });
});
