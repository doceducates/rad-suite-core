export interface AnatomyModelCatalogItem {
  id: string;
  title: string;
  category: 'system' | 'regional' | 'micro' | 'action';
  badge: string;
  description: string;
}

export const ANATOMY_MODEL_CATALOG: AnatomyModelCatalogItem[] = [
  // Core Body Systems
  { id: 'skeletal', title: 'Full Skeleton (939 Bones)', category: 'system', badge: 'System', description: 'Complete osteological human framework.' },
  { id: 'muscles', title: 'Musculature (747 Muscles)', category: 'system', badge: 'System', description: 'Full body somatic muscle layers.' },
  { id: 'circulatory', title: 'Cardiovascular (1,186 Vessels)', category: 'system', badge: 'System', description: 'Arterial tree and cardiac chambers.' },
  { id: 'nervous', title: 'Nervous System (1,332 Nerves)', category: 'system', badge: 'System', description: 'Central and peripheral neural pathways.' },
  { id: 'brain', title: 'Encephalon & Brain (3D Neuro)', category: 'system', badge: 'Organ', description: 'High-definition 3D cerebral hemispheres, cerebellum, and brainstem.' },
  { id: 'skull_head', title: 'Cranium & Facial Skeleton', category: 'system', badge: 'Organ', description: 'Articulated neurocranium and splanchnocranium.' },
  { id: 'skull_exploded', title: 'Exploded Cranium & Bones', category: 'system', badge: 'Special', description: 'Disarticulated cranial bones for osteological study.' },
  { id: 'visceral', title: 'Visceral Organs (Lungs, GI, Renal)', category: 'system', badge: 'System', description: 'Thoracoabdominal and pelvic organ complexes.' },
  { id: 'respiratory', title: 'Respiratory System', category: 'system', badge: 'System', description: 'Larynx, trachea, bronchi, and pulmonary lobes.' },
  { id: 'digestive', title: 'Digestive System', category: 'system', badge: 'System', description: 'Gastrointestinal tract from esophagus to rectum.' },
  { id: 'urinary', title: 'Urinary System', category: 'system', badge: 'System', description: 'Kidneys, ureters, bladder, and urethra.' },
  { id: 'integumentary', title: 'Surface Anatomy & Skin', category: 'system', badge: 'System', description: 'External human anatomical surface boundaries.' },

  // Regional 3D Cross Sections
  { id: 'xs_head_axial', title: 'Head & Brain Axial 3D Cross-Section', category: 'regional', badge: '3D Cut', description: 'Axial multi-planar slice through cranial vault.' },
  { id: 'xs_head_coronal', title: 'Head & Brain Coronal 3D Cross-Section', category: 'regional', badge: '3D Cut', description: 'Coronal planar cut through cerebral ventricles.' },
  { id: 'xs_head_sagittal', title: 'Head & Brain Sagittal 3D Cross-Section', category: 'regional', badge: '3D Cut', description: 'Midsagittal brainstem and corpus callosum.' },
  { id: 'xs_thorax', title: 'Thoracic Cavity 3D Cross-Section', category: 'regional', badge: '3D Cut', description: 'Cross-section through heart, lungs, and mediastinum.' },
  { id: 'xs_abdomen', title: 'Abdominal Cavity 3D Cross-Section', category: 'regional', badge: '3D Cut', description: 'Transverse cut showing liver, stomach, and kidneys.' },
  { id: 'xs_pelvis', title: 'Pelvic Cavity 3D Cross-Section', category: 'regional', badge: '3D Cut', description: 'Planar volume of pelvic organs and girdle.' },
  { id: 'xs_spinal_cord', title: 'Spinal Cord & Meninges 3D Cut', category: 'regional', badge: '3D Cut', description: 'Transverse section of spinal cord gray/white matter.' },

  // Microscopic & Histological 3D Models
  { id: 'micro_neuron', title: 'Multipolar Neuron & Synaptic Boutons', category: 'micro', badge: 'Micro', description: 'Soma, dendrites, myelin sheath, and axon terminal.' },
  { id: 'micro_nephron', title: 'Renal Nephron & Glomerulus', category: 'micro', badge: 'Micro', description: 'Bowman capsule, glomerulus, loops of Henle.' },
  { id: 'micro_eye', title: 'Ocular Anatomy & Retina', category: 'micro', badge: 'Sensory', description: 'Cornea, lens, vitreous body, and retinal layers.' },
  { id: 'micro_ear', title: 'Auditory Apparatus & Cochlea', category: 'micro', badge: 'Sensory', description: 'Tympanic membrane, ossicles, and cochlear canal.' },
  { id: 'micro_heart_wall', title: 'Myocardial Wall & Cardiac Conduction', category: 'micro', badge: 'Micro', description: 'Endocardium, myocardium, and epicardial layers.' },
  { id: 'micro_alveolus', title: 'Pulmonary Alveolus & Capillary Bed', category: 'micro', badge: 'Micro', description: 'Respiratory membrane and gas exchange interface.' },
  { id: 'micro_alveolar_sacs', title: 'Alveolar Sacs Complex', category: 'micro', badge: 'Micro', description: 'Terminal bronchioles and clustered alveolar sacs.' },
  { id: 'micro_hepatic_lobule', title: 'Hepatic Lobule & Portal Triad', category: 'micro', badge: 'Micro', description: 'Hepatocyte cords, sinusoids, and central vein.' },
  { id: 'micro_bone_osteon', title: 'Bone Osteon (Haversian System)', category: 'micro', badge: 'Micro', description: 'Concentric lamellae, lacunae, and Haversian canal.' },
  { id: 'micro_skin', title: 'Integumentary Dermis & Epidermis', category: 'micro', badge: 'Micro', description: 'Stratified squamous epithelium, dermis, hair follicles.' },
  { id: 'micro_intestinal_villi', title: 'Intestinal Villi & Crypts', category: 'micro', badge: 'Micro', description: 'Mucosal absorption surface with lacteals.' },
  { id: 'micro_dental_arches', title: 'Complete Dental Arches & Occlusion', category: 'micro', badge: 'Dental', description: 'Maxillary and mandibular dentition.' },
  { id: 'tooth_molar_3_roots', title: 'Maxillary Molar (3 Roots Anatomy)', category: 'micro', badge: 'Dental', description: 'Enamel, dentin, pulp cavity, and root canals.' },

  // Functional Biomechanics & Muscle Actions
  { id: 'action_shoulder_abduction', title: 'Shoulder Abduction (Deltoid / Supraspinatus)', category: 'action', badge: 'Motion', description: 'Coronal plane arm elevation dynamics.' },
  { id: 'action_shoulder_flexion', title: 'Shoulder Flexion (Anterior Deltoid / Pectoralis)', category: 'action', badge: 'Motion', description: 'Sagittal plane anterior arm elevation.' },
  { id: 'action_shoulder_elbow_flexion', title: 'Elbow Flexion (Biceps brachii / Brachialis)', category: 'action', badge: 'Motion', description: 'Forearm flexion mechanics.' },
  { id: 'action_forearm_pronation', title: 'Forearm Pronation (Pronator teres)', category: 'action', badge: 'Motion', description: 'Radioulnar rotation mechanics.' },
  { id: 'action_forearm_supination', title: 'Forearm Supination (Supinator / Biceps)', category: 'action', badge: 'Motion', description: 'Outward forearm rotation.' },
  { id: 'action_hip_flexion', title: 'Hip Flexion (Iliopsoas / Rectus femoris)', category: 'action', badge: 'Motion', description: 'Anterior thigh elevation.' },
  { id: 'action_hip_abduction', title: 'Hip Abduction (Gluteus medius / minimus)', category: 'action', badge: 'Motion', description: 'Lateral thigh excursion.' },
  { id: 'action_leg_extension', title: 'Knee Extension (Quadriceps femoris)', category: 'action', badge: 'Motion', description: 'Tibial extension on femoral condyles.' },
  { id: 'action_leg_flexion', title: 'Knee Flexion (Hamstrings complex)', category: 'action', badge: 'Motion', description: 'Posterior knee hinge flexion.' },
  { id: 'action_foot_dorsiflexion', title: 'Ankle Dorsiflexion (Tibialis anterior)', category: 'action', badge: 'Motion', description: 'Talocrural joint elevation.' },
  { id: 'action_spine_flexion', title: 'Spinal Flexion (Rectus abdominis)', category: 'action', badge: 'Motion', description: 'Anterior vertebral column flexion.' },
  { id: 'action_spine_extension', title: 'Spinal Extension (Erector spinae)', category: 'action', badge: 'Motion', description: 'Vertebral column hyperextension.' },
];
