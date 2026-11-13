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
    pwHash: 'b746a514482d14e1ad12df43bdc823bd83b38c718c9d7ff8401376989462c622',
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
