/* Semester Survival — authored chapter objectives and campaign progression.
 * Receives domain events from the host; does not own simulation time or world rendering.
 */
(function (root) {
  'use strict';

  const SAVE_KEY = 'semester-survival.campaign.v1';
  const SAVE_VERSION = 1;

  const CHAPTER_OBJECTIVES = Object.freeze({
    's1-arrival': [
      { id: 'meet-roommate', title: 'Meet Brian', description: 'Speak with your roommate in the residence.', match: { type: 'dialogue:opened', characterId: 'brian' } },
      { id: 'settle-in', title: 'Settle into your room', description: 'Rest in your shared residence.', match: { type: 'interaction:completed', activity: 'sleep' } }
    ],
    's1-orientation': [
      { id: 'township', title: 'Explore the township', description: 'Travel to the township.', match: { type: 'travel', destination: 'township' } },
      { id: 'campus', title: 'Find the campus', description: 'Reach the university campus.', match: { type: 'travel', destination: 'campus' } }
    ],
    's1-first-lecture': [
      { id: 'lecture', title: 'Attend a lecture', description: 'Attend a scheduled lecture on campus.', match: { type: 'interaction:completed', activity: 'lecture' } },
      { id: 'amina', title: 'Introduce yourself to Amina', description: 'Speak with your coursemate.', match: { type: 'dialogue:opened', characterId: 'amina' } }
    ],
    's1-budget': [
      { id: 'budget-talk', title: 'Ask about student budgeting', description: 'Discuss spending with Mama Njeri or Brian.', matchAny: [
        { type: 'dialogue:topic', topic: 'budget' }, { type: 'dialogue:opened', characterId: 'njeri' }, { type: 'dialogue:opened', characterId: 'brian' }
      ] },
      { id: 'record-budget', title: 'Make a budget plan', description: 'Record a budget review in the student phone.', match: { type: 'budget:reviewed' } }
    ],
    's1-first-assessment': [
      { id: 'prepare', title: 'Prepare for your CATs', description: 'Complete focused study or library sessions.', matchAny: [
        { type: 'interaction:completed', activity: 'study' }, { type: 'interaction:completed', activity: 'library' }
      ], requiredCount: 2 },
      { id: 'cat', title: 'Complete your first CAT', description: 'Record a CAT result for a course.', match: { type: 'assessment:submitted', assessment: 'cat' } }
    ],
    's2-routine': [
      { id: 'study', title: 'Build a study routine', description: 'Complete two focused study sessions.', match: { type: 'interaction:completed', activity: 'study' }, requiredCount: 2 },
      { id: 'rest', title: 'Protect your energy', description: 'Sleep or take a restorative nap.', matchAny: [
        { type: 'interaction:completed', activity: 'sleep' }, { type: 'activity:completed', activity: 'nap' }
      ] }
    ],
    's2-study-circle': [
      { id: 'circle', title: 'Bring Amina into the plan', description: 'Discuss study plans with Amina.', match: { type: 'dialogue:topic', characterId: 'amina', topic: 'study' } },
      { id: 'session', title: 'Revise together', description: 'Complete a library study session.', match: { type: 'interaction:completed', activity: 'library' } }
    ],
    's2-club': [
      { id: 'rep', title: 'Talk to Wanjiku', description: 'Speak with the class representative.', match: { type: 'dialogue:opened', characterId: 'wanjiku' } },
      { id: 'club', title: 'Join a student activity', description: 'Join a club at the student commons.', match: { type: 'interaction:completed', action: 'join-club' } }
    ],
    's3-group': [
      { id: 'group-chat', title: 'Coordinate with Amina', description: 'Discuss study or group work with Amina.', matchAny: [
        { type: 'dialogue:topic', characterId: 'amina', topic: 'study' }, { type: 'dialogue:topic', characterId: 'amina', topic: 'personal' }
      ] },
      { id: 'assignment', title: 'Move the work forward', description: 'Work on a course assignment.', match: { type: 'interaction:completed', activity: 'assignment' } }
    ],
    's3-income': [
      { id: 'shift', title: 'Complete a part-time shift', description: 'Work in the township or city.', match: { type: 'interaction:completed', activity: 'work' } },
      { id: 'plan-income', title: 'Plan your earnings', description: 'Review your budget after earning money.', match: { type: 'budget:reviewed' } }
    ],
    's3-deadlines': [
      { id: 'assignment-one', title: 'Work on assignment one', description: 'Make progress on a course assignment.', match: { type: 'interaction:completed', activity: 'assignment' } },
      { id: 'assignment-two', title: 'Work on another assignment', description: 'Complete another assignment work session.', match: { type: 'interaction:completed', activity: 'assignment' }, requiredCount: 2 }
    ],
    's4-results': [
      { id: 'results', title: 'Review your academic record', description: 'Open the academic results review in the student phone.', match: { type: 'academics:reviewed' } },
      { id: 'consult', title: 'Ask for guidance', description: 'Consult Dr. Mwangi about your progress.', match: { type: 'dialogue:opened', characterId: 'mwangi' } }
    ],
    's4-wellbeing': [
      { id: 'recover', title: 'Recover properly', description: 'Sleep or take a restorative nap.', matchAny: [
        { type: 'interaction:completed', activity: 'sleep' }, { type: 'activity:completed', activity: 'nap' }
      ] },
      { id: 'support', title: 'Talk to someone you trust', description: 'Have a conversation with Brian.', match: { type: 'dialogue:opened', characterId: 'brian' } }
    ],
    's4-direction': [
      { id: 'explore', title: 'Explore an academic interest', description: 'Complete a practical project or lab session.', matchAny: [
        { type: 'interaction:completed', activity: 'study' }, { type: 'interaction:completed', activity: 'assignment' }
      ] },
      { id: 'discuss', title: 'Discuss your direction', description: 'Share your plans with Amina.', match: { type: 'dialogue:opened', characterId: 'amina' } }
    ],
    's5-lab': [
      { id: 'lab', title: 'Complete a practical session', description: 'Use the campus data lab.', match: { type: 'interaction:completed', action: 'lab-session' } },
      { id: 'document', title: 'Document the result', description: 'Record a project or assignment work session.', match: { type: 'interaction:completed', activity: 'assignment' } }
    ],
    's5-portfolio': [
      { id: 'project', title: 'Build portfolio evidence', description: 'Work on a substantial project.', match: { type: 'interaction:completed', activity: 'assignment' }, requiredCount: 2 },
      { id: 'publish', title: 'Publish your portfolio entry', description: 'Record a portfolio publication in the student phone.', match: { type: 'portfolio:published' } }
    ],
    's5-mentor': [
      { id: 'prepare-question', title: 'Prepare a specific question', description: 'Complete a focused study session.', match: { type: 'interaction:completed', activity: 'study' } },
      { id: 'mentor', title: 'Seek lecturer feedback', description: 'Speak with Dr. Mwangi.', match: { type: 'dialogue:opened', characterId: 'mwangi' } }
    ],
    's6-search': [
      { id: 'career-centre', title: 'Visit the career centre', description: 'Reach Nairobi city and visit its career centre.', match: { type: 'interaction:completed', action: 'career-advice' } },
      { id: 'application', title: 'Submit an application', description: 'Record a tailored internship application.', match: { type: 'internship:applied' } }
    ],
    's6-interview': [
      { id: 'prepare-interview', title: 'Prepare for the interview', description: 'Review a portfolio project.', match: { type: 'portfolio:reviewed' } },
      { id: 'interview', title: 'Attend the interview', description: 'Record attendance at an internship interview.', match: { type: 'interaction:completed', action: 'attend-interview' } }
    ],
    's6-balance': [
      { id: 'academic-work', title: 'Keep academics moving', description: 'Complete an assignment work session.', match: { type: 'interaction:completed', activity: 'assignment' } },
      { id: 'lecturer', title: 'Check in with your lecturer', description: 'Consult Dr. Mwangi.', match: { type: 'dialogue:opened', characterId: 'mwangi' } }
    ],
    's7-proposal': [
      { id: 'research', title: 'Develop your research question', description: 'Work on a substantial academic project.', match: { type: 'interaction:completed', activity: 'assignment' }, requiredCount: 2 },
      { id: 'defend', title: 'Discuss your proposal', description: 'Seek feedback from Dr. Mwangi.', match: { type: 'dialogue:opened', characterId: 'mwangi' } }
    ],
    's7-team': [
      { id: 'team-talk', title: 'Resolve the disagreement', description: 'Discuss the project with Amina.', match: { type: 'dialogue:topic', characterId: 'amina', topic: 'personal' } },
      { id: 'team-work', title: 'Agree on responsibilities', description: 'Complete a project work session.', match: { type: 'interaction:completed', activity: 'assignment' } }
    ],
    's7-career': [
      { id: 'cv', title: 'Prepare your career profile', description: 'Record a CV preparation milestone.', match: { type: 'career:cv-prepared' } },
      { id: 'portfolio', title: 'Present your work', description: 'Review a portfolio project.', match: { type: 'portfolio:reviewed' } }
    ],
    's8-capstone': [
      { id: 'capstone', title: 'Complete capstone work', description: 'Complete two capstone work sessions.', match: { type: 'interaction:completed', activity: 'assignment' }, requiredCount: 2 },
      { id: 'feedback', title: 'Respond to feedback', description: 'Consult Dr. Mwangi.', match: { type: 'dialogue:opened', characterId: 'mwangi' } }
    ],
    's8-finals': [
      { id: 'cat', title: 'Complete outstanding CATs', description: 'Record CAT results across your courses.', match: { type: 'assessment:submitted', assessment: 'cat' }, requiredCount: 5, uniqueBy: 'courseIndex' },
      { id: 'exams', title: 'Complete final exams', description: 'Record exam results across your courses.', match: { type: 'assessment:submitted', assessment: 'exam' }, requiredCount: 5, uniqueBy: 'courseIndex' }
    ],
    's8-future': [
      { id: 'future', title: 'Prepare for what comes next', description: 'Attend an interview or record a graduation preparation event.', matchAny: [
        { type: 'interaction:completed', action: 'attend-interview' }, { type: 'graduation:prepared' }
      ] },
      { id: 'close', title: 'Close the chapter', description: 'Record your final reflection.', match: { type: 'journal:reflection' } }
    ]
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function matches(event, rule) {
    return Object.keys(rule).every(function (key) { return event[key] === rule[key]; });
  }
  function create(options) {
    options = options || {};
    const world = options.world || root.SemesterWorldContent;
    const life = options.lifeEngine;
    const storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const onEvent = typeof options.onEvent === 'function' ? options.onEvent : function () {};
    if (!world || !Array.isArray(world.semesterArcs) || !life || typeof life.getState !== 'function') {
      throw new Error('Campaign runtime requires authored world arcs and the life systems engine.');
    }
    let state = { version: SAVE_VERSION, semester: 1, chapterIndex: 0, progress: {}, completed: [], revision: 0 };
    function persist() {
      if (!storage) return false;
      try { storage.setItem(SAVE_KEY, JSON.stringify(state)); return true; } catch (error) { return false; }
    }
    function load() {
      if (!storage) return false;
      try {
        const saved = JSON.parse(storage.getItem(SAVE_KEY) || 'null');
        if (!saved || saved.version !== SAVE_VERSION || !Number.isInteger(saved.semester) ||
            !Number.isInteger(saved.chapterIndex) || saved.semester < 1 || saved.semester > 8 ||
            saved.chapterIndex < 0 || saved.chapterIndex > (world.semesterArcs[saved.semester - 1] || { chapters: [] }).chapters.length || !Array.isArray(saved.completed) ||
            !saved.progress || typeof saved.progress !== 'object') return false;
        state = saved;
        return true;
      } catch (error) { return false; }
    }
    function syncSemester() {
      const semester = life.getState().campaign.semester;
      if (semester !== state.semester && semester >= 1 && semester <= 8) {
        state.semester = semester;
        state.chapterIndex = 0;
        state.progress = {};
        persist();
      }
    }
    function currentArc() { return world.semesterArcs[state.semester - 1] || null; }
    function currentChapter() {
      const arc = currentArc();
      return arc && arc.chapters[state.chapterIndex] || null;
    }
    function stepsFor(chapter) {
      return (CHAPTER_OBJECTIVES[chapter.id] || []).map(function (step) {
        const saved = state.progress[chapter.id] && state.progress[chapter.id][step.id];
        return Object.assign({}, step, { count: saved ? saved.count : 0, requiredCount: step.requiredCount || 1, complete: !!(saved && saved.complete) });
      });
    }
    function getState() {
      syncSemester();
      const chapter = currentChapter();
      if (!chapter) return Object.freeze({ semester: state.semester, chapterIndex: state.chapterIndex, chapter: null, steps: [], completed: state.completed.slice(), campaignComplete: state.semester === 8, semesterObjectivesComplete: true });
      const steps = stepsFor(chapter);
      return Object.freeze({
        semester: state.semester, chapterIndex: state.chapterIndex, chapter: clone(chapter),
        steps: clone(steps), completed: state.completed.slice(),
        completedSteps: steps.filter(function (step) { return step.complete; }).length,
        totalSteps: steps.length, campaignComplete: false, semesterObjectivesComplete: false
      });
    }
    function recordEvent(event) {
      if (!event || typeof event.type !== 'string') throw new Error('Campaign event must include a type.');
      syncSemester();
      const chapter = currentChapter();
      if (!chapter) return getState();
      const definitions = CHAPTER_OBJECTIVES[chapter.id] || [];
      let changed = false;
      definitions.forEach(function (step) {
        const saved = state.progress[chapter.id] && state.progress[chapter.id][step.id];
        if (saved && saved.complete) return;
        const rules = step.matchAny || (step.match ? [step.match] : []);
        if (!rules.some(function (rule) { return matches(event, rule); })) return;
        if (!state.progress[chapter.id]) state.progress[chapter.id] = {};
        const progress = state.progress[chapter.id][step.id] || { count: 0, complete: false, seen: [] };
        if (step.uniqueBy) {
          const uniqueValue = event[step.uniqueBy];
          if (uniqueValue === undefined || uniqueValue === null || progress.seen.includes(uniqueValue)) return;
          progress.seen.push(uniqueValue);
        }
        progress.count = Math.min(step.requiredCount || 1, progress.count + 1);
        progress.complete = progress.count >= (step.requiredCount || 1);
        state.progress[chapter.id][step.id] = progress;
        changed = true;
        onEvent(Object.freeze({ type: 'objective:progress', chapterId: chapter.id, stepId: step.id, count: progress.count, requiredCount: step.requiredCount || 1, complete: progress.complete }));
      });
      if (changed) {
        state.revision += 1;
        const steps = stepsFor(chapter);
        if (steps.length && steps.every(function (step) { return step.complete; })) {
          state.completed.push(chapter.id);
          const previous = chapter.id;
          state.chapterIndex += 1;
          onEvent(Object.freeze({ type: 'chapter:completed', chapterId: previous, nextChapter: currentChapter() && currentChapter().id || null }));
        }
        persist();
      }
      return getState();
    }
    function reset() {
      state = { version: SAVE_VERSION, semester: life.getState().campaign.semester, chapterIndex: 0, progress: {}, completed: [], revision: 0 };
      persist();
      return getState();
    }
    load();
    syncSemester();
    return Object.freeze({ getState: getState, recordEvent: recordEvent, reset: reset, save: persist, saveKey: SAVE_KEY });
  }

  root.SemesterCampaignRuntime = Object.freeze({
    create: create, objectives: CHAPTER_OBJECTIVES, saveKey: SAVE_KEY, version: SAVE_VERSION
  });
})(typeof window !== 'undefined' ? window : globalThis);
