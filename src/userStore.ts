import { create } from 'zustand';

export type User = {
  id: string;
  name: string;
  groups: string[];
};

interface UserState {
  user: User | null;
  users: User[];
  groups: string[];
  login: (userId: string) => void;
  logout: () => void;
  addUser: (user: User) => void;
  addGroup: (group: string) => void;
  assignUserToGroup: (userId: string, group: string) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  users: [
    { id: '1', name: 'Alice', groups: ['admins'] },
    { id: '2', name: 'Bob', groups: ['editors'] },
    { id: '3', name: 'Charlie', groups: [] },
  ],
  groups: ['admins', 'editors', 'players'],
  login: (userId) => {
    const user = get().users.find(u => u.id === userId) || null;
    set({ user });
  },
  logout: () => set({ user: null }),
  addUser: (user) => set(state => ({ users: [...state.users, user] })),
  addGroup: (group) => set(state => ({ groups: [...state.groups, group] })),
  assignUserToGroup: (userId, group) => set(state => ({
    users: state.users.map(u =>
      u.id === userId && !u.groups.includes(group)
        ? { ...u, groups: [...u.groups, group] }
        : u
    )
  })),
}));
