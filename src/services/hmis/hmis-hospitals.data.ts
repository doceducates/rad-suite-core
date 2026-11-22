/**
 * Predefined Punjab HMIS Hospitals Directory (78 Tertiary & Specialized Hospitals)
 * Source: Punjab Health Department & HMIS Portal Login Catalog (hmis.punjab.gov.pk)
 */

export interface HmisHospital {
  readonly id: string;
  readonly name: string;
}

export const HMIS_HOSPITALS: readonly HmisHospital[] = [
  { id: '1', name: "Bahawal Victoria Hospital, Bahawalpur" },
  { id: '3', name: "Allama Iqbal Teaching Hospital, DG Khan" },
  { id: '4', name: "Allied Hospital, Faisalabad" },
  { id: '5', name: "Children Hospital, Faisalabad" },
  { id: '6', name: "Faisalabad Institute of Cardiology, Faisalabad" },
  { id: '7', name: "Allied-II Hospital (Old DHQ), Faisalabad" },
  { id: '8', name: "Faisalabad Teaching Hospital, Faisalabad" },
  { id: '9', name: "Gujranwala Medical College Teaching Hospital" },
  { id: '10', name: "Chaudhary Pervaiz Elahi Institute of Cardiology, Wazirabad" },
  { id: '11', name: "Aziz Bhatti Shaheed Teaching Hospital, Gujrat" },
  { id: '12', name: "The Children’s Hospital, University of Child Health Sciences, Lahore" },
  { id: '13', name: "Govt. Kot Khawaja Saeed Teaching Hospital, Lahore" },
  { id: '14', name: "Govt. M Nawaz Sharief Teaching Hospital, Lahore" },
  { id: '15', name: "Govt. Mian Munshi Teaching Hospital, Lahore" },
  { id: '17', name: "Lady Aitchison Hospital, Lahore" },
  { id: '18', name: "Govt. Said Mitha Teaching Hospital, Lahore" },
  { id: '19', name: "Lahore General Hospital, Lahore" },
  { id: '21', name: "Govt. Teaching Hospital, Shahdara, Lahore" },
  { id: '22', name: "Jinnah Hospital, Lahore" },
  { id: '23', name: "Punjab Dental Hospital, Lahore" },
  { id: '24', name: "Lady Willingdon Hospital, Lahore" },
  { id: '25', name: "Punjab Institute of Cardiology, Lahore" },
  { id: '26', name: "Mayo Hospital, Lahore" },
  { id: '27', name: "PUNJAB INSTITUTE OF MENTAL HEALTH, LAHORE" },
  { id: '30', name: "Services Hospital, Lahore" },
  { id: '31', name: "Sir Ganga Ram Hospital, Lahore" },
  { id: '32', name: "Children Hospital, Multan" },
  { id: '33', name: "Nishtar Hospital, Multan" },
  { id: '36', name: "Chaudhary Pervaiz Elahi Institute of Cardiology, Multan" },
  { id: '38', name: "Nishtar Institute of Dentistry, Multan" },
  { id: '39', name: "Shaikh Zayed Hospital, R. Y. Khan" },
  { id: '40', name: "Benazir Bhutto Hospital, Rawalpindi" },
  { id: '41', name: "Rawalpindi Teaching Hospital, Rawalpindi" },
  { id: '42', name: "Holy Family Hospital, Rawalpindi" },
  { id: '43', name: "Rawalpindi Institute Of Cardiology, Rawalpindi" },
  { id: '44', name: "Syed Muhammad Hussain Samli Hospital & Nawaz Sharif Cardiology Center" },
  { id: '46', name: "Sahiwal Teaching Hospital, Sahiwal" },
  { id: '48', name: "Dr. Faisal Masood Teaching Hospital, Sargodha" },
  { id: '50', name: "Allama Iqbal Memorial Hospital, Sialkot" },
  { id: '51', name: "Govt. Sardar Begum Teaching Hospital, Sialkot" },
  { id: '60', name: "Nishter II Tertiary Care Hospital, Multan" },
  { id: '61', name: "Gujranwala Teaching Hospital (OLD DHQ), Gujranwala" },
  { id: '62', name: "Nawab Sir Sadiq Muhammad Khan Abbasi Hospital, Bahawalpur" },
  { id: '63', name: "PITB Testing Hospital 1" },
  { id: '64', name: "PITB Testing Hospital 2" },
  { id: '65', name: "Sardar Fateh Muhammad Khan Buzdar Institute of Cardiology, DG Khan" },
  { id: '67', name: "Pak Italian Burn Centre, Nishtar Medical University, Multan" },
  { id: '68', name: "The Jinnah Burn & Reconstructive Surgery Center, Lahore" },
  { id: '69', name: "Punjab Institute of Neuro Sciences, Lahore" },
  { id: '70', name: "Fatima Jinnah Institute of Dental Science, Lahore" },
  { id: '81', name: "Maternal and Child Health Center, Institute of Public Health, Lahore" },
  { id: '86', name: "DHQ Teaching Hospital, Narowal" },
  { id: '88', name: "Pervaiz Elahi Institute of Cardiology (PIC), Bahawalpur" },
  { id: '89', name: "Punjab Central Warehouse" },
  { id: '91', name: "Institute of Ophthalmology & Allied Vision Sciences, Multan" },
  { id: '92', name: "UHS Clinical Laboratory Services" },
  { id: '93', name: "Ittefaq Hospital Trust, Lahore" },
  { id: '94', name: "University of Lahore Teaching Hospital" },
  { id: '95', name: "Sharif Medical City Hospital, Lahore" },
  { id: '96', name: "Bahria International Hospitals Orchard, Lahore" },
  { id: '97', name: "Mukhtar A. Sheikh Memorial Welfare Hospital, Multan" },
  { id: '98', name: "Buch International Hospital, Multan" },
  { id: '99', name: "Medicare Hospital, Multan" },
  { id: '100', name: "Maroof Healthcare Services Islamabad" },
  { id: '103', name: "Bahria International Hospital, Rawalpindi" },
  { id: '104', name: "Farooq Hospital West Wood Lahore" },
  { id: '105', name: "Farooq Hospital Islamabad Branch Rawalpindi" },
  { id: '106', name: "Nawaz Sharif Institute of Cardiology, Sargodha" },
  { id: '107', name: "Mujahid Hospital, Faisalabad" },
  { id: '109', name: "Nawaz Sharif institute of Cancer Treatment & Research Hospital, Lahore" },
  { id: '108', name: "Sahiwal Institute of Cardiology, Sahiwal" },
  { id: '110', name: "Jinnah Institute of Cardiology" },
  { id: '111', name: "Govt. TB Hospital, Sargodha" },
  { id: '112', name: "Nawaz Sharif Cardiology Center, Samli, Murree" },
  { id: '113', name: "Hameed Latif Hospital, Garden Town, Lahore" },
  { id: '114', name: "Hub & Spoke Model Hospital Zahir Pir, Rahim Yar Khan" },
  { id: '115', name: "Farooq Hospital, Bahria Enclave, Islamabad" },
  { id: '116', name: "Mianwali Teaching Hospital, Minawali" },
] as const;

/**
 * Returns a hospital by its HMIS ID, or undefined if not found.
 */
export function getHmisHospitalById(id: string | number): HmisHospital | undefined {
  const normalizedId = String(id).trim();
  return HMIS_HOSPITALS.find((h) => h.id === normalizedId);
}

/**
 * Performs case-insensitive search by hospital name or city.
 */
export function searchHmisHospitals(query: string): HmisHospital[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [...HMIS_HOSPITALS];
  return HMIS_HOSPITALS.filter((h) => h.name.toLowerCase().includes(q) || h.id === q);
}
