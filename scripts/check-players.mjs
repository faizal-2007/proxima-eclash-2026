import { getSupabaseClient } from '../api/_lib/supabase.js';

async function main() {
  const client = getSupabaseClient();
  const { data: reg } = await client.from('registrations').select('registration_id, full_name, campus_id, game');
  
  const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const efPlayers = [
    'Mohammad razan', 'Muhammed Azim Anees',
    'Mohammad Faizal', 'shinan ahamed rafiq',
    'Shahad P A', 'Fezin',
    'Mohammed Hashim', 'Rayyan B M',
    'Abdul Rameez', 'Muhaz abbas',
    'Mohammed muheez', 'Muhammed kp',
    'Mazinkp',
    'Mohammed mashooq', 'Mohammed rishan',
    'MOMIN MOHAMMED AERAF', 'Muhammed Sinan B!',
    'azwin omer', 'ummer faraz ali',
    'Sharan', 'Sharfuddhin',
    'Mahammed Ashim',
    'Anas karani', 'mohamed zidan',
    'Umarul Hayyan',
    'Ahmed mohammed ali', 'Rumais Hussain',
    'Thousif',
    'MUHAMMAD JASHVEEN TH', 'Harshith pk',
    'Seyyed asfar',
    'ZIAN SALIM', 'DHANISH',
    'Gulshan', 'Muhammad raief',
    'Mahammad ashraf', 'A Mohammed Hazim',
    'Abdul Hafeez Ahmed'
  ];

  console.log('--- EFOOTBALL PLAYERS CHECK ---');
  let efMissing = 0;
  for (const p of efPlayers) {
    const match = reg.find(r => 
      normalize(r.full_name) === normalize(p) || 
      normalize(r.full_name).includes(normalize(p)) || 
      normalize(p).includes(normalize(r.full_name))
    );
    if (!match) efMissing++;
    console.log(p, '=>', match ? `${match.registration_id} (${match.full_name})` : 'NOT_IN_DB');
  }
  console.log('Missing eFootball:', efMissing);

  const carromPlayers = [
    'Mahammad Nihal', 'Mohammed hashir hussain',
    'Fathima Rihaf', 'Ahmed shairaz',
    'Amira Shahla',
    'Khatija mifra shabeer', 'Salma simra',
    'Farhan k', 'Mohammed murshid',
    'A Mohammed Hazim', 'Sameeksha',
    'Ayan Abdul Latheef', 'Mohammad Sadeed Hasan',
    'Apseena E R', 'Abdul Thabish',
    'Esha Rajeev', 'Aboobakkar Siddiq',
    'Mohammed Sufail', 'Mohammed sihad',
    'Naadir Mansoor', 'Rumais Hussain',
    'Khatheeja Haifa', 'Mohammed REHAN',
    'Mohammed Shazil', 'Ayesha Alfeeza',
    'Nihad Ahmad P', 'Mohammad Hafeez',
    'Mohammed Raheesh Basheer', 'Fathima beevi ca',
    'Rimsha Fathima', 'Insha Najeeb',
    'Hishad Ahmed', 'MOHAMMED MINHAL',
    'Diya Iram', 'Fathimathul Zahra KP',
    'Mohammad fazal',
    'Muhammed Shanis A.K', 'ASHMIK RISHAB',
    'Mahammad ashraf', 'Mohammed sabith hussain',
    'Mahammad irshad', 'TUFAIL AHMED',
    'DHANISH', 'Mohammed Hashim',
    'Muhamed raief', 'Muhammad Ashin',
    'Muhammed Azim Anees', 'Muaad',
    'Muhammad Dilkash', 'Mahammad Inaaz',
    'Mohammed Mahroof', 'Fathima Afra',
    'Seyyed asfar', 'Aleemath Shaima',
    'Gulshan', 'Rakshya .k',
    'Aysha Rimsha', 'Abdul Hafeez Ahmed',
    'Hazara rila', 'Firas Abdul Khadar Hejmadi',
    'Fathima Minha K', 'Fathima Raneem',
    'Francisca Surjith M', 'ayesha fameeza',
    'Faheem Abubaker', 'Mahammad rifad'
  ];

  console.log('\n--- CARROM PLAYERS CHECK ---');
  let carromMissing = 0;
  for (const p of carromPlayers) {
    const match = reg.find(r => 
      normalize(r.full_name) === normalize(p) || 
      normalize(r.full_name).includes(normalize(p)) || 
      normalize(p).includes(normalize(r.full_name))
    );
    if (!match) carromMissing++;
    console.log(p, '=>', match ? `${match.registration_id} (${match.full_name})` : 'NOT_IN_DB');
  }
  console.log('Missing Carrom:', carromMissing);
}

main().catch(console.error);
