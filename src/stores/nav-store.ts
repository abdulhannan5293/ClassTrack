import { create } from 'zustand';

export type ViewType =
  | 'auth'
  | 'dashboard'
  | 'classroom'
  | 'my-attendance'
  | 'my-results'
  | 'gpa-calculator'
  | 'profile'
  | 'report'
  | 'deploy';

export type ClassroomTab = 'overview' | 'roster' | 'subjects' | 'attendance' | 'results' | 'gpa-config' | 'announcements' | 'heatmap' | 'leaderboard' | 'settings' | 'notes' | 'analytics' | 'messages' | 'polls' | 'discussion' | 'trend' | 'grades' | 'feedback' | 'resources' | 'deadlines';

interface NavState {
  view: ViewType;
  classroomId: string | null;
  classroomTab: ClassroomTab;
  previousView: ViewType | null;

  navigate: (view: ViewType) => void;
  openClassroom: (id: string) => void;
  setClassroomTab: (tab: ClassroomTab) => void;
  goBack: () => void;
}

export const useNavStore = create<NavState>((set, get) => ({
  view: 'auth',
  classroomId: null,
  classroomTab: 'overview',
  previousView: null,

  navigate: (view) =>
    set((state) => ({
      view,
      previousView: state.view,
      classroomId: view !== 'classroom' ? null : state.classroomId,
    })),

  openClassroom: (id) =>
    set((state) => ({
      view: 'classroom',
      classroomId: id,
      classroomTab: 'overview',
      previousView: state.view,
    })),

  setClassroomTab: (tab) => set({ classroomTab: tab }),

  goBack: () =>
    set((state) => ({
      view: state.previousView || 'dashboard',
      previousView: null,
    })),
}));
