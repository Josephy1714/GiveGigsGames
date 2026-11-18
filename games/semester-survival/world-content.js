/* Authored world, cast, dialogue and eight-semester campaign content.
 * Content is data-only so simulation, UI and rendering can consume one source of truth.
 */
(function (root) {
  'use strict';

  const districts = {
    residence: {
      title: 'Student Residence',
      mood: 'A compact shared student residence with lived-in corridors and a courtyard.',
      exits: ['township'],
      places: [
        { id: 'room', name: 'Shared Room', actions: ['sleep', 'study', 'check-phone'] },
        { id: 'courtyard', name: 'Residence Courtyard', actions: ['talk-roommate', 'socialize'] },
        { id: 'laundry', name: 'Laundry Corner', actions: ['wash-clothes'] }
      ]
    },
    township: {
      title: 'Township',
      mood: 'The everyday student district: affordable services, foot traffic and familiar faces.',
      exits: ['residence', 'campus', 'city'],
      places: [
        { id: 'mama-njeri-kiosk', name: 'Mama Njeri’s Food Kiosk', actions: ['buy-meal', 'talk-vendor'] },
        { id: 'print-hub', name: 'Print Hub', actions: ['print-notes', 'bind-assignment'] },
        { id: 'barber', name: 'Barber Shop', actions: ['get-haircut', 'talk-barber'] },
        { id: 'mini-mart', name: 'Corner Mini-Mart', actions: ['buy-supplies'] },
        { id: 'matatu-stage', name: 'Transport Stage', actions: ['travel-campus', 'travel-city'] },
        { id: 'study-cafe', name: 'Study Café', actions: ['study', 'meet-friend'] }
      ]
    },
    campus: {
      title: 'University Campus',
      mood: 'A busy academic core with lecture spaces, student services and quiet study corners.',
      exits: ['residence', 'township', 'city'],
      places: [
        { id: 'main-gate', name: 'Main Gate', actions: ['check-noticeboard', 'meet-students'] },
        { id: 'lecture-hall', name: 'Main Lecture Hall', actions: ['attend-lecture', 'ask-question'] },
        { id: 'library', name: 'University Library', actions: ['study', 'borrow-book'] },
        { id: 'data-lab', name: 'Computer and Data Lab', actions: ['lab-session', 'work-on-project'] },
        { id: 'student-commons', name: 'Student Commons', actions: ['socialize', 'join-club'] },
        { id: 'administration', name: 'Student Administration', actions: ['check-fees', 'resolve-record'] },
        { id: 'lecturer-office', name: 'Lecturer Offices', actions: ['consult-lecturer'] }
      ]
    },
    city: {
      title: 'Nairobi City',
      mood: 'A later-game destination for interviews, errands, events and new opportunities.',
      exits: ['township', 'campus'],
      places: [
        { id: 'career-centre', name: 'Career Centre', actions: ['career-advice', 'find-internship'] },
        { id: 'interview-suite', name: 'Interview Suite', actions: ['attend-interview'] },
        { id: 'bookshop', name: 'Bookshop Arcade', actions: ['buy-books'] },
        { id: 'innovation-hub', name: 'Innovation Hub', actions: ['network', 'pitch-project'] }
      ]
    }
  };

  const characters = {
    brian: {
      name: 'Brian', role: 'Roommate', home: 'residence', traits: ['practical', 'witty', 'protective'],
      introduction: 'You must be the new roommate. I’m Brian. Top bunk is mine, by the way.',
      topics: {
        budget: ['Track your spending. Small things add up before the month ends.', 'I can show you where students get affordable meals.'],
        study: ['The library gets quieter after lunch. That is usually my best study window.'],
        personal: ['First week can feel strange. Give yourself time to settle in.']
      }
    },
    amina: {
      name: 'Amina', role: 'Coursemate', home: 'campus', traits: ['curious', 'ambitious', 'empathetic'],
      introduction: 'Hey, you’re in my class, right? I’m Amina. Have you found the lecture hall yet?',
      topics: {
        study: ['Let’s compare notes after the lecture. I want to make sure I understood the examples.'],
        project: ['A good project starts with a question worth answering, not just a fancy title.'],
        personal: ['You do not have to figure out the whole degree this week. One step at a time.']
      }
    },
    wanjiku: {
      name: 'Wanjiku', role: 'Class Representative', home: 'campus', traits: ['organised', 'direct', 'fair'],
      introduction: 'I’m Wanjiku, the class rep. Check the noticeboard and class group for updates.',
      topics: {
        deadlines: ['I post confirmed deadlines as soon as the department shares them. Do not rely on rumours.'],
        groupwork: ['Choose a group that communicates. A brilliant idea cannot rescue a team that disappears.']
      }
    },
    njeri: {
      name: 'Mama Njeri', role: 'Food Vendor', home: 'township', traits: ['warm', 'observant', 'business-minded'],
      introduction: 'Karibu! What are you having today? Tell me your budget and we will work something out.',
      topics: {
        budget: ['Plan your meals for the week. Buying whatever looks nice every day gets expensive.'],
        campus: ['The morning rush is real. If you are late, take something you can carry.']
      }
    },
    mwangi: {
      name: 'Dr. Mwangi', role: 'Lecturer', home: 'campus', traits: ['demanding', 'measured', 'supportive'],
      introduction: 'Good morning. I expect questions, not silence. If a concept is unclear, ask early.',
      topics: {
        coursework: ['Show me the step where your reasoning changes. We can work from there.'],
        consultation: ['Bring your attempt and specific questions. Consultation is not a substitute for starting the work.']
      }
    }
  };

  const semesterArcs = [
    {
      semester: 1, title: 'Finding Your Footing', theme: 'belonging and first routines',
      chapters: [
        { id: 's1-arrival', title: 'A Room of Your Own', objective: 'Settle into the shared residence and meet Brian.', location: 'residence', character: 'brian' },
        { id: 's1-orientation', title: 'The Long Way to Class', objective: 'Navigate the township and reach the main campus gate.', location: 'township', character: 'njeri' },
        { id: 's1-first-lecture', title: 'Names on the Register', objective: 'Attend the first lecture and introduce yourself to Amina.', location: 'campus', character: 'amina' },
        { id: 's1-budget', title: 'The Month Is Longer Than the Money', objective: 'Make a basic food and transport budget before spending again.', location: 'township', character: 'njeri' },
        { id: 's1-first-assessment', title: 'Show Your Working', objective: 'Prepare for and complete the first CAT in every registered course.', location: 'campus', character: 'mwangi' }
      ]
    },
    {
      semester: 2, title: 'Building a Rhythm', theme: 'habits and friendship',
      chapters: [
        { id: 's2-routine', title: 'A Week That Works', objective: 'Build a weekly study and rest routine.', location: 'residence', character: 'brian' },
        { id: 's2-study-circle', title: 'Better Together', objective: 'Form a reliable study circle and complete a shared revision session.', location: 'campus', character: 'amina' },
        { id: 's2-club', title: 'Beyond the Timetable', objective: 'Attend a student-club meeting and make a commitment.', location: 'campus', character: 'wanjiku' }
      ]
    },
    {
      semester: 3, title: 'Pressure and Independence', theme: 'group work and first income',
      chapters: [
        { id: 's3-group', title: 'The Group Chat Is Silent', objective: 'Organise a group assignment and resolve a missed commitment.', location: 'campus', character: 'amina' },
        { id: 's3-income', title: 'Earned, Not Found', objective: 'Complete a part-time shift and plan how the income will be used.', location: 'township', character: 'njeri' },
        { id: 's3-deadlines', title: 'Three Deadlines, One Week', objective: 'Submit two assignments before their deadlines.', location: 'campus', character: 'wanjiku' }
      ]
    },
    {
      semester: 4, title: 'The Midpoint', theme: 'reassessment and resilience',
      chapters: [
        { id: 's4-results', title: 'The Transcript Conversation', objective: 'Review results and identify one course that needs a new strategy.', location: 'campus', character: 'mwangi' },
        { id: 's4-wellbeing', title: 'No One Runs on Empty', objective: 'Balance study with rest and a supportive conversation.', location: 'residence', character: 'brian' },
        { id: 's4-direction', title: 'What Do You Want to Build?', objective: 'Choose an academic interest to explore more deeply.', location: 'campus', character: 'amina' }
      ]
    },
    {
      semester: 5, title: 'Deeper Work', theme: 'specialisation and practical skills',
      chapters: [
        { id: 's5-lab', title: 'The Lab Is Not a Lecture Hall', objective: 'Complete a practical lab session and document the result.', location: 'campus', character: 'mwangi' },
        { id: 's5-portfolio', title: 'Proof of Work', objective: 'Publish a substantial project entry in the student portfolio.', location: 'campus', character: 'amina' },
        { id: 's5-mentor', title: 'Ask Better Questions', objective: 'Seek feedback from a lecturer or mentor.', location: 'campus', character: 'mwangi' }
      ]
    },
    {
      semester: 6, title: 'Opportunity Has a Cost', theme: 'internships and trade-offs',
      chapters: [
        { id: 's6-search', title: 'The Application Trail', objective: 'Research and submit a tailored internship application.', location: 'city', character: 'wanjiku' },
        { id: 's6-interview', title: 'Tell Them What You Can Do', objective: 'Prepare for and attend an internship interview.', location: 'city', character: 'amina' },
        { id: 's6-balance', title: 'Keep the Degree Moving', objective: 'Protect academic progress while pursuing an opportunity.', location: 'campus', character: 'mwangi' }
      ]
    },
    {
      semester: 7, title: 'The Final Stretch', theme: 'research and career preparation',
      chapters: [
        { id: 's7-proposal', title: 'A Question Worth Researching', objective: 'Develop and defend a capstone research question.', location: 'campus', character: 'mwangi' },
        { id: 's7-team', title: 'People Behind the Project', objective: 'Resolve a project-team disagreement and agree on responsibilities.', location: 'campus', character: 'amina' },
        { id: 's7-career', title: 'Make Your Work Visible', objective: 'Prepare a CV and present a portfolio project.', location: 'city', character: 'wanjiku' }
      ]
    },
    {
      semester: 8, title: 'The Next Chapter', theme: 'completion and transition',
      chapters: [
        { id: 's8-capstone', title: 'The Work Must Stand', objective: 'Complete the capstone and respond to feedback.', location: 'campus', character: 'mwangi' },
        { id: 's8-finals', title: 'One Last Examination Season', objective: 'Complete all final assessments and clear outstanding academic tasks.', location: 'campus', character: 'amina' },
        { id: 's8-future', title: 'Beyond the Gate', objective: 'Attend a final interview or graduation preparation event.', location: 'city', character: 'brian' }
      ]
    }
  ];

  function validate() {
    const ids = new Set();
    Object.keys(districts).forEach(function (key) {
      const district = districts[key];
      district.places.forEach(function (place) {
        if (ids.has(place.id)) throw new Error('Duplicate place id: ' + place.id);
        ids.add(place.id);
        if (!Array.isArray(place.actions) || !place.actions.length) throw new Error('Place has no actions: ' + place.id);
      });
      district.exits.forEach(function (exit) {
        if (!districts[exit] || !districts[exit].exits.includes(key)) throw new Error('World route must be reciprocal: ' + key + ' -> ' + exit);
      });
    });
    if (semesterArcs.length !== 8) throw new Error('Campaign must contain eight semester arcs.');
    semesterArcs.forEach(function (arc, index) {
      if (arc.semester !== index + 1 || !arc.chapters.length) throw new Error('Invalid semester arc: ' + arc.semester);
      arc.chapters.forEach(function (chapter) {
        if (!districts[chapter.location] || !characters[chapter.character]) throw new Error('Invalid chapter reference: ' + chapter.id);
      });
    });
    return true;
  }

  validate();
  root.SemesterWorldContent = Object.freeze({
    districts: districts,
    characters: characters,
    semesterArcs: semesterArcs,
    validate: validate
  });
})(typeof window !== 'undefined' ? window : globalThis);
