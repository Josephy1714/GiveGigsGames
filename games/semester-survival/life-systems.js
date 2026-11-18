/* Semester Survival — persistent university-life simulation core.
 * No rendering assumptions. All mutations pass through validated transactions.
 * Character maturity/age progression is intentionally deferred to a later milestone.
 */
(function (root) {
  'use strict';

  const SAVE_KEY = 'semester-survival.life.v1';
  const SAVE_VERSION = 1;
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const ACTIVITIES = {
    lecture:       { label: 'Attend lecture', minutes: 120, energy: -12, hunger: -8, stress: 2, money: 0, attendance: 1 },
    study:         { label: 'Focused study', minutes: 90, energy: -15, hunger: -7, stress: 3, money: 0, study: 12 },
    library:       { label: 'Library study session', minutes: 120, energy: -17, hunger: -9, stress: 1, money: 0, study: 17 },
    eat:           { label: 'Buy a meal', minutes: 30, energy: 5, hunger: 35, stress: -2, money: -120 },
    snack:         { label: 'Buy a snack', minutes: 15, energy: 2, hunger: 16, stress: -1, money: -45 },
    sleep:         { label: 'Sleep', minutes: 480, energy: 70, hunger: -12, stress: -24, money: 0 },
    nap:           { label: 'Rest', minutes: 60, energy: 22, hunger: -4, stress: -8, money: 0 },
    print:         { label: 'Print course materials', minutes: 20, energy: -2, hunger: -1, stress: 0, money: -35, preparation: 4 },
    work:          { label: 'Part-time shift', minutes: 180, energy: -25, hunger: -15, stress: 8, money: 450 },
    socialize:     { label: 'Spend time with a friend', minutes: 60, energy: -5, hunger: -3, stress: -8, money: -30, relationship: 5 },
    assignment:    { label: 'Work on assignment', minutes: 120, energy: -20, hunger: -10, stress: 6, money: 0, assignment: 15 },
    consultation:  { label: 'Consult lecturer', minutes: 45, energy: -5, hunger: -2, stress: -3, money: 0, preparation: 8 },
    exercise:      { label: 'Exercise', minutes: 45, energy: -14, hunger: -7, stress: -12, money: 0, wellbeing: 8 }
  };

  const COURSE_NAMES = [
    'Foundations of the Discipline',
    'Mathematical Methods',
    'Programming and Problem Solving',
    'Communication and Academic Practice',
    'Introduction to Data and Evidence'
  ];

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function id(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 9); }

  function makeCourses(semester) {
    return COURSE_NAMES.map(function (name, i) {
      return {
        id: 'S' + semester + '-U' + (i + 1),
        name: name,
        credits: 3,
        studyPoints: 0,
        preparation: 0,
        assignmentPoints: 0,
        attendance: 0,
        catScore: null,
        examScore: null,
        grade: null
      };
    });
  }

  function createNewGame(options) {
    options = options || {};
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    return {
      schemaVersion: SAVE_VERSION,
      createdAt: now,
      updatedAt: now,
      player: { displayName: 'Student', characterIdentity: 'base-protagonist-v1' },
      campaign: { semester: 1, completedSemesters: [], graduated: false, ending: null },
      calendar: { dayIndex: 0, week: 1, minuteOfDay: 7 * 60, totalMinutes: 0 },
      location: 'residence',
      condition: { energy: 90, hunger: 78, stress: 18, wellbeing: 75 },
      finances: { cash: 2500, debt: 0, lifetimeEarned: 0, lifetimeSpent: 0, transactions: [] },
      academics: { cumulativeGpa: 0, courses: makeCourses(1), transcript: [] },
      relationships: {
        roommate: { name: 'Brian', affinity: 20, trust: 10, history: [] },
        coursemate: { name: 'Amina', affinity: 15, trust: 8, history: [] },
        classRep: { name: 'Wanjiku', affinity: 10, trust: 5, history: [] },
        vendor: { name: 'Mama Njeri', affinity: 10, trust: 5, history: [] },
        lecturer: { name: 'Dr. Mwangi', affinity: 5, trust: 5, history: [] }
      },
      inventory: ['student-id', 'notebook', 'phone'],
      quests: [
        { id: 'orientation', title: 'Find your place', description: 'Explore the residence, township and campus.', status: 'active', progress: 0, target: 3 },
        { id: 'first-lecture', title: 'First lecture', description: 'Attend your first scheduled lecture.', status: 'active', progress: 0, target: 1 },
        { id: 'first-meal', title: 'Fuel the day', description: 'Buy a meal before hunger gets too low.', status: 'active', progress: 0, target: 1 }
      ],
      flags: { firstLecture: false, firstMeal: false, orientationComplete: false },
      journal: [{ id: id('entry'), day: 'Monday', time: '07:00', text: 'A new semester begins. Check the timetable and make a plan.' }]
    };
  }

  function assertState(s) {
    if (!s || s.schemaVersion !== SAVE_VERSION) throw new Error('Unsupported save schema.');
    if (!Number.isInteger(s.campaign.semester) || s.campaign.semester < 1 || s.campaign.semester > 9) throw new Error('Invalid semester.');
    if (!Number.isInteger(s.calendar.dayIndex) || s.calendar.dayIndex < 0 || s.calendar.dayIndex > 6) throw new Error('Invalid calendar day.');
    if (!Number.isFinite(s.calendar.minuteOfDay) || s.calendar.minuteOfDay < 0 || s.calendar.minuteOfDay >= 1440) throw new Error('Invalid time of day.');
    ['energy', 'hunger', 'stress', 'wellbeing'].forEach(function (k) {
      if (!Number.isFinite(s.condition[k]) || s.condition[k] < 0 || s.condition[k] > 100) throw new Error('Invalid condition: ' + k);
    });
    if (!Number.isFinite(s.finances.cash) || !Number.isFinite(s.finances.debt) || s.finances.debt < 0) throw new Error('Invalid finances.');
    if (!Array.isArray(s.academics.courses) || !Array.isArray(s.academics.transcript)) throw new Error('Invalid academic record.');
    return true;
  }

  function addJournal(s, text) {
    s.journal.push({
      id: id('entry'),
      day: DAYS[s.calendar.dayIndex],
      time: String(Math.floor(s.calendar.minuteOfDay / 60)).padStart(2, '0') + ':' + String(s.calendar.minuteOfDay % 60).padStart(2, '0'),
      text: text
    });
    if (s.journal.length > 120) s.journal.splice(0, s.journal.length - 120);
  }

  function advanceTime(s, minutes) {
    let remaining = minutes;
    while (remaining > 0) {
      const untilMidnight = 1440 - s.calendar.minuteOfDay;
      const step = Math.min(remaining, untilMidnight);
      s.calendar.minuteOfDay += step;
      s.calendar.totalMinutes += step;
      remaining -= step;
      if (s.calendar.minuteOfDay >= 1440) {
        s.calendar.minuteOfDay = 0;
        s.calendar.dayIndex = (s.calendar.dayIndex + 1) % 7;
        if (s.calendar.dayIndex === 0) s.calendar.week += 1;
        s.condition.energy = clamp(s.condition.energy - 4, 0, 100);
        s.condition.hunger = clamp(s.condition.hunger - 5, 0, 100);
        s.condition.stress = clamp(s.condition.stress + 2, 0, 100);
      }
    }
  }

  function recalculateGpa(s) {
    const graded = s.academics.transcript;
    if (!graded.length) { s.academics.cumulativeGpa = 0; return; }
    const credits = graded.reduce((a, c) => a + c.credits, 0);
    const points = graded.reduce((a, c) => a + c.gradePoint * c.credits, 0);
    s.academics.cumulativeGpa = Number((points / credits).toFixed(2));
  }

  function gradePoint(score) {
    if (score >= 80) return 4.0;
    if (score >= 75) return 3.7;
    if (score >= 70) return 3.3;
    if (score >= 65) return 3.0;
    if (score >= 60) return 2.7;
    if (score >= 55) return 2.3;
    if (score >= 50) return 2.0;
    if (score >= 45) return 1.0;
    return 0;
  }

  function createEngine(storage) {
    storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    let state = createNewGame();

    function commit(mutator) {
      const draft = clone(state);
      const result = mutator(draft);
      assertState(draft);
      draft.updatedAt = Date.now();
      state = draft;
      save();
      return { state: getState(), result: result };
    }

    function save() {
      if (!storage) return false;
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(state));
        return true;
      } catch (e) { return false; }
    }

    function load() {
      if (!storage) return false;
      try {
        const raw = storage.getItem(SAVE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion !== SAVE_VERSION) return false;
        parsed.relationships = parsed.relationships || {};\n        parsed.finances.transactions = Array.isArray(parsed.finances.transactions) ? parsed.finances.transactions : [];
        const relationshipDefaults = {
          roommate: { name: 'Brian', affinity: 20, trust: 10, history: [] },
          coursemate: { name: 'Amina', affinity: 15, trust: 8, history: [] },
          classRep: { name: 'Wanjiku', affinity: 10, trust: 5, history: [] },
          vendor: { name: 'Mama Njeri', affinity: 10, trust: 5, history: [] },
          lecturer: { name: 'Dr. Mwangi', affinity: 5, trust: 5, history: [] }
        };
        Object.keys(relationshipDefaults).forEach(function (key) {
          if (!parsed.relationships[key]) parsed.relationships[key] = relationshipDefaults[key];
        });
        assertState(parsed);
        state = parsed;
        return true;
      } catch (e) { return false; }
    }

    function getState() { return clone(state); }

    function travel(destination) {
      const routes = {
        residence: { township: 12, campus: 22 },
        township: { residence: 12, campus: 10, city: 35 },
        campus: { residence: 22, township: 10, city: 30 },
        city: { township: 35, campus: 30 }
      };
      return commit(function (s) {
        const cost = routes[s.location] && routes[s.location][destination];
        if (!cost) throw new Error('That destination is not connected from here.');
        advanceTime(s, cost);
        s.condition.energy = clamp(s.condition.energy - 2, 0, 100);
        s.condition.hunger = clamp(s.condition.hunger - 2, 0, 100);
        s.location = destination;
        if (s.quests[0] && s.quests[0].status === 'active') {
          s.quests[0].progress = Math.min(3, s.quests[0].progress + 1);
          if (s.quests[0].progress >= 3) {
            s.quests[0].status = 'complete';
            s.flags.orientationComplete = true;
          }
        }
        addJournal(s, 'Travelled to ' + destination + '.');
        return { destination: destination, minutes: cost };
      });
    }

    function perform(activityKey, options) {
      options = options || {};
      const activity = ACTIVITIES[activityKey];
      if (!activity) throw new Error('Unknown activity.');
      return commit(function (s) {
        if (s.campaign.graduated) throw new Error('The campaign is complete.');
        if (activity.money < 0 && s.finances.cash < -activity.money) throw new Error('Not enough cash. Check your balance before confirming.');
        if (activityKey === 'lecture' && s.location !== 'campus') throw new Error('Lectures can only be attended on campus.');
        if (activityKey === 'library' && s.location !== 'campus') throw new Error('The library is on campus.');
        if (activityKey === 'print' && s.location !== 'township' && s.location !== 'campus') throw new Error('Find a printing shop on campus or in the township.');
        if (activityKey === 'work' && s.location !== 'township' && s.location !== 'city') throw new Error('Find a part-time shift in the township or city.');
        if (activityKey === 'sleep' && s.location !== 'residence') throw new Error('You can only sleep in your residence.');
        if ((activityKey === 'eat' || activityKey === 'snack') && s.location !== 'township') throw new Error('Buy food from a township food vendor.');
        if (activityKey === 'consultation' && s.location !== 'campus') throw new Error('Lecturer consultations take place on campus.');
        if (activityKey === 'socialize' && !['residence', 'township', 'campus'].includes(s.location)) throw new Error('There is no available social space here.');
        if (s.condition.energy < 8 && activityKey !== 'sleep' && activityKey !== 'nap') throw new Error('You are exhausted. Rest before taking on another activity.');
        advanceTime(s, activity.minutes);
        s.condition.energy = clamp(s.condition.energy + activity.energy, 0, 100);
        s.condition.hunger = clamp(s.condition.hunger + activity.hunger, 0, 100);
        s.condition.stress = clamp(s.condition.stress + activity.stress, 0, 100);
        s.condition.wellbeing = clamp(s.condition.wellbeing + (activity.wellbeing || 0), 0, 100);
        if (activity.money < 0) {
          s.finances.cash += activity.money;
          s.finances.lifetimeSpent += -activity.money;
          s.finances.transactions.push({ id: id('txn'), day: DAYS[s.calendar.dayIndex], minute: s.calendar.totalMinutes, type: 'expense', category: activityKey, description: activity.label, amount: activity.money, balance: s.finances.cash });
        } else if (activity.money > 0) {
          s.finances.cash += activity.money;
          s.finances.lifetimeEarned += activity.money;
          s.finances.transactions.push({ id: id('txn'), day: DAYS[s.calendar.dayIndex], minute: s.calendar.totalMinutes, type: 'income', category: activityKey, description: activity.label, amount: activity.money, balance: s.finances.cash });
        }
        if (s.finances.transactions.length > 200) s.finances.transactions.splice(0, s.finances.transactions.length - 200);
        if (activityKey === 'lecture') {
          const course = s.academics.courses[(s.calendar.dayIndex + s.calendar.week) % s.academics.courses.length];
          course.attendance += 1;
          course.preparation = clamp(course.preparation + 2, 0, 100);
          s.flags.firstLecture = true;
          const q = s.quests.find(x => x.id === 'first-lecture');
          if (q) { q.progress = 1; q.status = 'complete'; }
        }
        if (activity.study || activityKey === 'library') {
          const course = s.academics.courses[options.courseIndex || 0];
          if (course) course.studyPoints = clamp(course.studyPoints + (activity.study || 17), 0, 100);
        }
        if (activity.preparation) {
          const course = s.academics.courses[options.courseIndex || 0];
          if (course) course.preparation = clamp(course.preparation + activity.preparation, 0, 100);
        }
        if (activity.assignment) {
          const course = s.academics.courses[options.courseIndex || 0];
          if (course) course.assignmentPoints = clamp(course.assignmentPoints + activity.assignment, 0, 100);
        }
        if (activity.relationship) {
          const key = options.person || 'coursemate';
          const person = s.relationships[key];
          if (person) {
            person.affinity = clamp(person.affinity + activity.relationship, 0, 100);
            person.history.push({ day: DAYS[s.calendar.dayIndex], event: 'Spent time together' });
          }
        }
        if (activityKey === 'eat') {
          s.flags.firstMeal = true;
          const q = s.quests.find(x => x.id === 'first-meal');
          if (q) { q.progress = 1; q.status = 'complete'; }
        }
        addJournal(s, activity.label + ' completed.');
        return { activity: activityKey, minutes: activity.minutes };
      });
    }

    function recordRelationship(personKey, changes, eventText) {
      changes = changes || {};
      return commit(function (s) {
        const person = s.relationships[personKey];
        if (!person) throw new Error('Unknown relationship: ' + personKey);
        const affinity = Number.isFinite(changes.affinity) ? changes.affinity : 0;
        const trust = Number.isFinite(changes.trust) ? changes.trust : 0;
        person.affinity = clamp(person.affinity + affinity, 0, 100);
        person.trust = clamp(person.trust + trust, 0, 100);
        const event = String(eventText || 'Shared a conversation').slice(0, 160);
        person.history.push({ day: DAYS[s.calendar.dayIndex], event: event });
        if (person.history.length > 80) person.history.splice(0, person.history.length - 80);
        addJournal(s, event + ' with ' + person.name + '.');
        return { person: personKey, affinity: person.affinity, trust: person.trust };
      });
    }

    function registerCourses(courseIds) {
      if (!Array.isArray(courseIds) || courseIds.length < 3 || courseIds.length > 5) throw new Error('Register between three and five courses.');
      if (new Set(courseIds).size !== courseIds.length) throw new Error('A course cannot be registered twice.');
      const current = state.academics.courses;
      const available = current.reduce(function(map, course){ map[course.id]=course; return map; }, {});
      if (courseIds.some(function(courseId){ return !available[courseId]; })) throw new Error('One or more selected courses are not available in this semester catalogue.');
      const credits = courseIds.reduce(function(total, courseId){ return total + available[courseId].credits; }, 0);
      if (credits < 9 || credits > 15) throw new Error('The semester credit load must be between 9 and 15 credits.');
      return commit(function(s){
        const byId=s.academics.courses.reduce(function(map,course){map[course.id]=course;return map;},{});
        s.academics.courses=courseIds.map(function(courseId){return byId[courseId];});
        addJournal(s,'Course registration updated: '+courseIds.length+' courses, '+credits+' credits.');
        return {courseIds:courseIds.slice(),credits:credits};
      });
    }

    function recordAssignmentSubmission(courseId, assignmentId, points) {
      if (typeof courseId !== 'string' || !courseId || typeof assignmentId !== 'string' || !assignmentId) throw new Error('Course and assignment identifiers are required.');
      if (!Number.isFinite(points) || points < 0 || points > 100) throw new Error('Assignment score must be between 0 and 100.');
      return commit(function(s){
        const course=s.academics.courses.find(function(item){return item.id===courseId;});
        if(!course)throw new Error('That course is not currently registered.');
        course.assignmentPoints=clamp(course.assignmentPoints+points,0,100);
        addJournal(s,'Assignment submitted for '+course.name+'.');
        return {courseId:courseId,assignmentId:assignmentId,assignmentPoints:course.assignmentPoints};
      });
    }

    function submitAssessment(courseIndex, type, score) {
      if (type !== 'cat' && type !== 'exam') throw new Error('Assessment must be CAT or exam.');
      if (!Number.isInteger(courseIndex) || courseIndex < 0 || courseIndex >= state.academics.courses.length) throw new Error('Invalid course.');
      if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error('Score must be between 0 and 100.');
      return commit(function (s) {
        const course = s.academics.courses[courseIndex];
        if (type === 'cat') course.catScore = score;
        else course.examScore = score;
        addJournal(s, type.toUpperCase() + ' recorded for ' + course.name + ': ' + score + '%.');
      });
    }

    function completeSemester() {
      return commit(function (s) {
        if (s.campaign.semester > 8) throw new Error('All semesters are already complete.');
        const courses = s.academics.courses;
        if (courses.some(c => c.examScore === null || c.catScore === null)) throw new Error('Complete every course CAT and exam before semester results.');
        const results = courses.map(function (c) {
          const score = clamp(c.examScore * 0.55 + c.catScore * 0.2 + c.assignmentPoints * 0.15 + c.studyPoints * 0.1, 0, 100);
          const gp = gradePoint(score);
          const result = { id: c.id, name: c.name, credits: c.credits, score: Number(score.toFixed(1)), gradePoint: gp };
          s.academics.transcript.push(result);
          c.grade = gp;
          return result;
        });
        s.campaign.completedSemesters.push({ semester: s.campaign.semester, results: results });
        recalculateGpa(s);
        if (s.campaign.semester === 8) {
          s.campaign.graduated = true;
          const gpa = s.academics.cumulativeGpa;
          s.campaign.ending = gpa >= 3.5 && s.condition.wellbeing >= 45 ? 'honours-and-wellbeing' : gpa >= 2 ? 'resilient-graduate' : 'hard-earned-graduate';
        } else {
          s.campaign.semester += 1;
          s.academics.courses = makeCourses(s.campaign.semester);
          s.calendar.week = 1;
          s.calendar.dayIndex = 0;
          s.calendar.minuteOfDay = 7 * 60;
          s.quests = [];
        }
        addJournal(s, 'Semester results released. Cumulative GPA: ' + s.academics.cumulativeGpa.toFixed(2) + '.');
        return { results: results, gpa: s.academics.cumulativeGpa, graduated: s.campaign.graduated, ending: s.campaign.ending };
      });
    }

    function getTimetable() {
      return DAYS.slice(0, 5).map(function (day, index) {
        return { day: day, start: '09:00', end: '11:00', course: state.academics.courses[index % state.academics.courses.length].name, location: 'Main lecture hall' };
      });
    }

    load();
    return Object.freeze({
      getState: getState, save: save, load: load, travel: travel, perform: perform,
      submitAssessment: submitAssessment, registerCourses: registerCourses, recordAssignmentSubmission: recordAssignmentSubmission, recordRelationship: recordRelationship, completeSemester: completeSemester,
      getTimetable: getTimetable, activities: clone(ACTIVITIES), days: DAYS.slice(),
      saveKey: SAVE_KEY
    });
  }

  root.SemesterLifeSystems = Object.freeze({
    createEngine: createEngine,
    createNewGame: createNewGame,
    gradePoint: gradePoint,
    saveKey: SAVE_KEY,
    version: SAVE_VERSION
  });
})(typeof window !== 'undefined' ? window : globalThis);
