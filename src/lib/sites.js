// Public front page for a real clinic, shown at its own address before anyone signs in.
// Details come from the clinic's public listings (Google, Practo, Justdial); the clinic confirms them.
// Kept out of saved data so an update here reaches every browser straight away.
export const SITES = {
  drmourya: {
    name: 'Dr. Mourya’s Dental Clinic',
    tagline: 'Quality dental care at an affordable cost, in the heart of Mowa, Raipur.',
    rating: 4.8,
    reviews: 110,
    // Shared staff password for now, kept only as a SHA-256 hash of `<slug>:<password>`.
    pwHash: '6afbbae4e756a7b4cff2d45c8e4a136d1ef1e71cf8dc9e4952c1dd4e83f1b8d0',
    fee: 150,
    phone: '+91 79746 38171',
    whatsapp: '917974638171',
    address: '1st floor, Paras Bhavan, Vidhan Sabha Road, opp. SBI ATM, Mowa, Raipur, Chhattisgarh 492014',
    mapQuery: 'Dr. Mourya’s Dental Clinic, Paras Bhavan, Vidhan Sabha Road, Mowa, Raipur',
    // [day index (0 = Sunday), list of [open, close] in 24h hours]
    hours: [
      [1, [[10, 14], [17, 21]]],
      [2, [[10, 14], [17, 21]]],
      [3, [[10, 14], [17, 21]]],
      [4, [[10, 14], [17, 21]]],
      [5, [[10, 14], [17, 21]]],
      [6, [[10, 14], [17, 21]]],
      [0, [[10, 15]]],
    ],
    doctor: {
      name: 'Dr. Pawan Kumar Mourya',
      title: 'Dental surgeon',
      years: 13,
      quals: [
        'BDS, Government Dental College & Hospital, Nagpur (2013)',
        'MSc Anatomy, PGIMER Chandigarh',
        'Reg. no. CGDC/13/G/1239',
      ],
    },
    // The clinic's printed prescription pad, copied so the app prints the same sheet.
    pad: {
      title: ['Dr. MOURYA’S', 'MULTISPECIALITY DENTAL CLINIC'],
      ring: 'DR. MOURYA’S MULTISPECIALITY DENTAL CLINIC',
      address: ['Infront of SBI Mowa, Beside ICICI Bank, Paras Bhawan,', 'Vidhan Sabha Road, Mowa, Raipur (C.G.) 492001'],
      doctors: [
        { name: 'DR. PAWAN KUMAR MOURYA', lines: ['B.D.S. (Govt. Dental College, Raipur)', 'M.Sc Anatomy (PGIMER, Chandigarh)'], phone: '94060 20118, 70001 15807' },
        { name: 'DR. KAVITA PRASHANT', lines: ['B.D.S. (CDCRI, Rajnandgaon)', 'Cosmetic Dental Surgeon', 'Reg. No. CGDC/12/G/1170'], phone: '97544 14070, 79746 38171' },
      ],
      services: [
        ['Digital Dental X-Ray', 'दांतों का कम्प्यूटराइज्ड एक्स-रे'],
        ['Advanced Root Canal Treatment (RCT) & Re-RCT', 'दांतों के नस का इलाज'],
        ['Extraction', 'दांत निकालना'],
        ['Impaction Surgery', 'अक्ल दाढ़ की सर्जरी'],
        ['Tooth Cleaning & Polishing', 'दांतों की सफाई'],
        ['Flap Surgery & Gingival Curettage', 'पायरिया, मसूढ़ों से खून आने का उपचार'],
        ['Crown Bridge & Implant', 'फिक्स दांत एवं इम्प्लांट सुविधा'],
        ['Complete Denture', 'बत्तीसी लगाना'],
        ['Natural Tooth Colored Filling', 'दांत के रंग की फिलिंग'],
        ['Orthodontic Treatment', 'आड़े-तिरछे दांतों का इलाज विशेषज्ञ द्वारा'],
        ['Child Dental Care', 'बच्चों के दांतों का इलाज विशेषज्ञ द्वारा'],
      ],
      hours: ['Monday - Saturday', '10:00 am to 8:30 pm', 'Sunday', '10:00 am to 2:00 pm'],
      appointments: ['0771 4028310', '83056 49133'],
      history: ['Diabetes', 'Hypertension', 'Drug allergy', 'Pregnancy', 'Asthma', 'Thyroid', 'Others'],
      consent: 'मैं सहमत हूं, डॉक्टर ने मुझे सारी प्रक्रिया व इलाज के बारे में मेरी समझ में मुझे इलाज के दौरान या उसके बाद होने वाली तकलीफ के बारे में मुझे अवगत किया है। मैं अपनी समझ से इलाज करने की स्वीकृति देता/देती हूं।',
      footer: 'Not Valid for Medicolegal Purpose',
    },
    services: [
      ['stethoscope', 'Check-up & consultation', 'Complete oral check-up and advice on the right treatment.'],
      ['sparkles', 'Scaling & polishing', 'Professional cleaning for healthy gums and a brighter smile.'],
      ['tooth', 'Extractions', 'Gentle tooth removal, including impacted wisdom teeth.'],
      ['crown', 'Crowns & bridges', 'Strong, natural-looking caps and bridges for damaged or missing teeth.'],
      ['implant', 'Dental implants', 'Fixed replacement teeth that look and feel like your own.'],
      ['smile', 'Cosmetic dentistry', 'Smile makeovers to help you smile with confidence.'],
    ],
  },
}
