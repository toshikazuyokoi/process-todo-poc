export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export class User {
  private role: UserRole;
  private readonly id: number | null;
  private name: string;
  private email: string | null;
  private timezone: string;

  constructor(params: {
    id?: number | null;
    name: string;
    email?: string | null;
    role?: UserRole | string;
    timezone?: string;
  }) {
    this.id = params.id || null;
    this.name = params.name;
    this.email = params.email || null;
    this.timezone = params.timezone || 'Asia/Tokyo';
    
    const roleValue = params.role || UserRole.MEMBER;
    this.role = typeof roleValue === 'string' ? (roleValue as UserRole) : roleValue;
    if (!Object.values(UserRole).includes(this.role)) {
      this.role = UserRole.MEMBER; // Default to member if invalid
    }
  }

  getId(): number | null {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string | null {
    return this.email;
  }

  getRole(): UserRole {
    return this.role;
  }

  getTimezone(): string {
    return this.timezone;
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('User name cannot be empty');
    }
    this.name = name;
  }

  updateEmail(email: string | null): void {
    if (email && !this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    this.email = email;
  }

  updateRole(role: UserRole): void {
    this.role = role;
  }

  updateTimezone(timezone: string): void {
    if (!timezone || timezone.trim().length === 0) {
      throw new Error('Timezone cannot be empty');
    }
    this.timezone = timezone;
  }

  // Alias methods for consistency with use cases
  setName(name: string): void {
    this.updateName(name);
  }

  setEmail(email: string | null): void {
    this.updateEmail(email);
  }

  setRole(role: string): void {
    this.updateRole(role as UserRole);
  }

  setTimezone(timezone: string): void {
    this.updateTimezone(timezone);
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  isMember(): boolean {
    return this.role === UserRole.MEMBER;
  }

  isViewer(): boolean {
    return this.role === UserRole.VIEWER;
  }

  canEdit(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.MEMBER;
  }

  canDelete(): boolean {
    return this.role === UserRole.ADMIN;
  }

  canManageUsers(): boolean {
    return this.role === UserRole.ADMIN;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}