import 'dotenv/config';
import { db } from '@/db';
import { users, patients, studies, reports, intakeDocuments, hmisSubmissions, templates, auditLog } from '@/db/schema';
import { hashPassword } from '@/services/auth.service';

function daysAgo(days: number, hour = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d;
}

export async function seedDatabase() {
  console.log('Seeding Rad Suite clinical database...');

  const [existingUser] = await db.select({ id: users.id }).from(users).limit(1);
  if (existingUser) {
    console.log('Database already has users. Skipping seed.');
    return;
  }

  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@12345!';
  const passHash = await hashPassword(initialPassword);

  const [drAyesha, drBilal, drSana, techBilal] = await db
    .insert(users)
    .values([
      {
        name: 'Lead Radiologist',
        email: process.env.INITIAL_ADMIN_EMAIL || 'admin@radsuite.org',
        passwordHash: passHash,
        role: 'admin',
        title: 'Consultant Radiologist',
        licenseNo: 'RAD-001',
        department: 'Radiology',
        avatarColor: '#4a7c59',
        hmisHospitalId: '1',
        hmisUsername: 'admin_rad',
      },
      {
        name: 'Dr. Bilal Qureshi',
        email: 'bilal@radsuite.pk',
        passwordHash: passHash,
        role: 'radiologist',
        title: 'Consultant Radiologist — FRCR',
        licenseNo: 'PMDC-39821-R',
        department: 'Neuroradiology & Body Imaging',
        avatarColor: '#a855f7',
      },
      {
        name: 'Dr. Sana Iqbal',
        email: 'sana@radsuite.pk',
        passwordHash: passHash,
        role: 'resident',
        title: 'Senior Resident — FCPS Part-II Trainee',
        licenseNo: 'PMDC-58912-T',
        department: 'Diagnostic Radiology',
        avatarColor: '#10b981',
      },
      {
        name: 'Bilal Hussain',
        email: 'tech@radsuite.pk',
        passwordHash: passHash,
        role: 'technologist',
        title: 'Senior MRI/CT Technologist',
        licenseNo: 'AART-9931',
        department: 'Imaging Operations',
        avatarColor: '#f59e0b',
      },
    ])
    .returning();

  const patientRows = await db
    .insert(patients)
    .values([
      {
        mrNumber: 'MR-26-0001',
        fullName: 'Muhammad Asif Raza',
        age: 54,
        gender: 'Male',
        phone: '0300-1234567',
        cnic: '35202-9911234-7',
        guardianName: 'Ghulam Raza',
        address: 'House 12, Street 4, Gulberg III, Lahore',
        bloodGroup: 'B+',
        allergies: 'Iodinated contrast (mild pruritus)',
        clinicalNotes: 'Known hypertensive x 10 yrs, heavy smoker.',
      },
      {
        mrNumber: 'MR-26-0002',
        fullName: 'Fatima Noor',
        age: 38,
        gender: 'Female',
        phone: '0321-7788112',
        cnic: '35201-4477881-2',
        guardianName: 'Muhammad Yousaf',
        address: 'Model Town Block B, Lahore',
        bloodGroup: 'O+',
        allergies: 'Penicillin',
        clinicalNotes: 'Post-partum 6 weeks, acute right flank pain.',
      },
      {
        mrNumber: 'MR-26-0003',
        fullName: 'Hamza Tariq',
        age: 9,
        gender: 'Male',
        phone: '0333-1122009',
        cnic: '',
        guardianName: 'Tariq Mehmood (Father)',
        address: 'Johar Town Phase 2, Lahore',
        bloodGroup: 'A+',
        allergies: 'None known',
        clinicalNotes: 'Fall from bicycle, left forearm pain and deformity.',
      },
      {
        mrNumber: 'MR-26-0004',
        fullName: 'Zainab Bibi',
        age: 63,
        gender: 'Female',
        phone: '0345-9987654',
        cnic: '35202-1234567-8',
        guardianName: 'Noor Ahmed',
        address: 'Samanabad, Lahore',
        bloodGroup: 'AB+',
        allergies: 'None',
        clinicalNotes: 'Sudden onset vertigo and ataxia. Rule out posterior circulation stroke.',
      },
      {
        mrNumber: 'MR-26-0005',
        fullName: 'Imran Shah',
        age: 28,
        gender: 'Male',
        phone: '0311-4455667',
        cnic: '35404-6677889-1',
        guardianName: 'Wali Shah',
        address: 'Township Sector B1, Lahore',
        bloodGroup: 'B-',
        allergies: 'None',
        clinicalNotes: 'RTA, high-speed motorcycle impact, seat-belt contusion.',
      },
      {
        mrNumber: 'MR-26-0006',
        fullName: 'Sadia Anwar',
        age: 45,
        gender: 'Female',
        phone: '0301-2223334',
        cnic: '35202-8877665-4',
        guardianName: 'Anwar Ali',
        address: 'DHA Phase 5, Lahore',
        bloodGroup: 'O-',
        allergies: 'None',
        clinicalNotes: 'Screening mammography, strong maternal family history of Ca Breast.',
      },
    ])
    .returning();

  const p = (mr: string) => patientRows.find((x) => x.mrNumber === mr)!.id;

  const studyRows = await db
    .insert(studies)
    .values([
      {
        accessionNumber: 'ACC-2602-0001',
        patientId: p('MR-26-0004'),
        modality: 'CT',
        scanType: 'CT Brain Non-Contrast',
        bodyPart: 'Brain',
        priority: 'urgent',
        status: 'completed',
        scheduledAt: daysAgo(2, 8),
        referringDoctor: 'Dr. Naveed Akhtar (Neurology)',
        clinicalHistory: 'Sudden onset vertigo and gait ataxia. Known hypertensive.',
        contrastUsed: false,
        machineId: 'CT-SIEMENS-128',
        technologist: 'Bilal Hussain',
        assignedRadiologistId: drAyesha.id,
      },
      {
        accessionNumber: 'ACC-2602-0002',
        patientId: p('MR-26-0001'),
        modality: 'CT',
        scanType: 'CT Chest with IV Contrast',
        bodyPart: 'Chest',
        priority: 'urgent',
        status: 'completed',
        scheduledAt: daysAgo(3, 10),
        referringDoctor: 'Dr. Naveed Akhtar (Pulmonology)',
        clinicalHistory: 'Chronic cough x 3 months, haemoptysis once, 6 kg weight loss.',
        contrastUsed: true,
        contrastAgent: 'Omnipaque 350',
        contrastVolumeMl: 80,
        machineId: 'CT-SIEMENS-128',
        technologist: 'Bilal Hussain',
        assignedRadiologistId: drAyesha.id,
      },
      {
        accessionNumber: 'ACC-2602-0003',
        patientId: p('MR-26-0002'),
        modality: 'Ultrasound',
        scanType: 'Ultrasound KUB',
        bodyPart: 'Kidneys, Ureters, Bladder',
        priority: 'routine',
        status: 'completed',
        scheduledAt: daysAgo(1, 11),
        referringDoctor: 'Dr. Saima Riaz (Urology)',
        clinicalHistory: 'Right flank colicky pain radiating to groin.',
        contrastUsed: false,
        machineId: 'US-TOSHIBA-APLIO',
        technologist: 'Dr. Sana Iqbal',
        assignedRadiologistId: drBilal.id,
      },
      {
        accessionNumber: 'ACC-2602-0004',
        patientId: p('MR-26-0003'),
        modality: 'X-Ray',
        scanType: 'X-Ray Left Forearm AP/Lateral',
        bodyPart: 'Left Forearm',
        priority: 'urgent',
        status: 'in_progress',
        scheduledAt: daysAgo(0, 9),
        referringDoctor: 'Dr. Kashif Iqbal (Orthopaedics)',
        clinicalHistory: 'Pediatric fall from bicycle, distal radius pain.',
        contrastUsed: false,
        machineId: 'XR-DIGITAL-PHILIPS',
        technologist: 'Bilal Hussain',
        assignedRadiologistId: drSana.id,
      },
      {
        accessionNumber: 'ACC-2602-0005',
        patientId: p('MR-26-0005'),
        modality: 'CT',
        scanType: 'CT Abdomen & Pelvis (Trauma Protocol)',
        bodyPart: 'Abdomen & Pelvis',
        priority: 'stat',
        status: 'in_progress',
        scheduledAt: daysAgo(0, 7),
        referringDoctor: 'Dr. Usman Ghani (Emergency Trauma)',
        clinicalHistory: 'RTA, unstable hemodynamics, rigid abdomen. STAT evaluation.',
        contrastUsed: true,
        contrastAgent: 'Ultravist 370',
        contrastVolumeMl: 100,
        machineId: 'CT-SIEMENS-128',
        technologist: 'Bilal Hussain',
        assignedRadiologistId: drAyesha.id,
      },
    ])
    .returning();

  const s = (acc: string) => studyRows.find((x) => x.accessionNumber === acc)!.id;

  await db.insert(reports).values([
    {
      studyId: s('ACC-2602-0001'),
      patientId: p('MR-26-0004'),
      authorId: drAyesha.id,
      status: 'final',
      technique: 'Contiguous 5 mm axial sections were obtained through the brain without intravenous contrast.',
      comparison: 'None available.',
      findings: 'No acute intracranial hemorrhage or territorial infarct. Grey-white matter differentiation is preserved. Ventricles and basal cisterns are symmetric and age-appropriate. Mild age-related involutional changes.',
      impression: '1. No acute intracranial hemorrhage or major vascular territorial infarct.\n2. Mild cerebral involutional changes.',
      recommendation: 'MRI brain with diffusion-weighted sequences (DWI) if posterior circulation stroke remains a high clinical suspicion.',
      criticalFinding: false,
      signedAt: daysAgo(2, 11),
      signedBy: 'Dr. Ayesha Rahman (FCPS)',
    },
    {
      studyId: s('ACC-2602-0002'),
      patientId: p('MR-26-0001'),
      authorId: drAyesha.id,
      status: 'final',
      technique: 'Helical CT acquisition from lung apices to adrenal glands following intravenous administration of 80 mL Omnipaque 350.',
      comparison: 'Chest radiograph dated 3 weeks prior.',
      findings: 'There is a spiculated soft tissue mass in the right upper lobe measuring 3.4 x 2.9 cm abutting the oblique fissure. Multiple enlarged ipsilateral right hilar and subcarinal lymph nodes are noted, largest measuring 1.8 cm. No pleural effusion.',
      impression: '1. Spiculated right upper lobe mass with ipsilateral hilar and subcarinal lymphadenopathy — highly suspicious for primary bronchogenic carcinoma (Lung-RADS 4X).\n2. No distant intrathoracic metastases identified.',
      recommendation: 'CT-guided core biopsy and PET-CT staging. Urgent MDT referral.',
      criticalFinding: true,
      signedAt: daysAgo(3, 13),
      signedBy: 'Dr. Ayesha Rahman (FCPS)',
    },
    {
      studyId: s('ACC-2602-0003'),
      patientId: p('MR-26-0002'),
      authorId: drBilal.id,
      status: 'final',
      technique: 'Real-time high-resolution greyscale and colour Doppler ultrasound of kidneys, ureters, and bladder.',
      comparison: 'None.',
      findings: 'Right kidney measures 10.8 cm with a 7 mm echogenic focus exhibiting posterior acoustic shadowing in the mid pole. Mild right hydroureteronephrosis. Left kidney and urinary bladder are unremarkable.',
      impression: '1. 7 mm right mid-pole renal calculus with mild obstructive uropathy.\n2. Normal left kidney and bladder.',
      recommendation: 'Urology consultation.',
      criticalFinding: false,
      signedAt: daysAgo(1, 13),
      signedBy: 'Dr. Bilal Qureshi (FRCR)',
    },
  ]);

  await db.insert(templates).values([
    {
      title: 'CT Brain (Non-contrast) — Normal',
      modality: 'CT',
      study: 'Brain Plain',
      technique: 'Axial contiguous sections through the intracranial vault without IV contrast.',
      findings: 'No acute intracranial hemorrhage, territorial infarct, midline shift or extra-axial collection. Grey-white matter differentiation is preserved. Ventricles and cisterns are normal.',
      impression: 'Unremarkable non-contrast CT brain.',
      recommendation: 'Clinical correlation.',
      createdBy: drAyesha.id,
    },
    {
      title: 'Chest X-Ray (PA) — Normal',
      modality: 'X-Ray',
      study: 'Chest PA',
      technique: 'Single erect PA radiograph of the chest in full inspiration.',
      findings: 'Both lung fields are clear. No focal consolidation, pneumothorax, or pleural effusion. Cardiothoracic ratio is normal (< 50%). Both costophrenic angles are sharp.',
      impression: 'Normal chest radiograph.',
      recommendation: 'None.',
      createdBy: drAyesha.id,
    },
  ]);

  await db.insert(hmisSubmissions).values([
    {
      studyId: s('ACC-2602-0002'),
      status: 'submitted',
      targetPortal: 'https://hmis.punjab.gov.pk/',
      payload: {
        accession: 'ACC-2602-0002',
        mrNumber: 'MR-26-0001',
        patient: 'Muhammad Asif Raza',
        findingsSummary: 'Right upper lobe lung mass with hilar adenopathy',
      },
      note: 'Auto-submitted to Punjab HMIS radiology module.',
      submittedAt: daysAgo(3, 14),
    },
  ]);

  await db.insert(auditLog).values([
    {
      userId: drAyesha.id,
      userName: 'Dr. Ayesha Rahman',
      action: 'sign_report',
      entityType: 'Report',
      entityId: s('ACC-2602-0002'),
      details: 'Finalized and digitally signed CT Chest report with critical finding alert',
      ipAddress: '192.168.1.45',
    },
  ]);

  console.log('Rad Suite database successfully seeded with clinical dataset!');
}

if (process.argv[1] && /src[\\/]db[\\/]seed\.ts$/.test(process.argv[1])) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
