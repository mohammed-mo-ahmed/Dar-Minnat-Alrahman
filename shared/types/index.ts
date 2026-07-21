export type Role = 'admin' | 'sheikh' | 'guardian' | 'student';

export type Profile = {
  id: string;
  role: Role;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: string;
  name: string;
  gender: 'male' | 'female';
  created_at: string;
};

export type Group = {
  id: string;
  section_id: string;
  name: string;
  supervisor_id: string | null;
  finance_type: 'deduction' | 'subscription' | 'none';
  fee_mode: 'per_student' | 'per_group';
  monthly_fee: number;
  deduction_amount: number;
  no_memorization_deduction: number;
  created_at: string;
  section?: Section | null;
  supervisor?: { id: string; display_name: string | null; phone: string | null } | null;
};

export type Student = {
  id: string;
  full_name: string;
  student_phone: string | null;
  guardian_phone: string | null;
  address: string | null;
  section_id: string | null;
  group_id: string | null;
  user_id: string | null;
  current_memorization: string | null;
  last_memorized: string | null;
  next_assignment: string | null;
  evaluation: string | null;
  points_balance: number;
  subscription_amount: number;
  photo_url: string | null;
  join_date: string;
  created_at: string;
  updated_at: string;
  group?: Group | null;
};

export type AttendanceStatus =
  | 'present_memorized'
  | 'present_not_memorized'
  | 'absent_unexcused'
  | 'absent_excused';

export type Attendance = {
  id: string;
  student_id: string;
  group_id: string | null;
  session_date: string;
  status: AttendanceStatus;
  memorized: boolean;
  excuse_note: string | null;
  created_by: string | null;
  created_at: string;
  student?: Pick<Student, 'id' | 'full_name'> | null;
};

export type FinanceType =
  | 'absence_deduction'
  | 'no_memorization_deduction'
  | 'subscription'
  | 'activity_fee'
  | 'payment'
  | 'adjustment';

export type FinanceTransaction = {
  id: string;
  student_id: string;
  month_key: string;
  type: FinanceType;
  amount: number;
  description: string | null;
  ref_attendance_id: string | null;
  ref_activity_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type Exam = {
  id: string;
  student_id: string;
  exam_date: string;
  subject: string | null;
  score: string | null;
  evaluation: string | null;
  created_by: string | null;
  created_at: string;
};

export type Reward = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  created_at: string;
};

export type RewardRedemption = {
  id: string;
  student_id: string;
  reward_id: string;
  redeemed_at: string;
  status: 'issued' | 'cancelled';
  reward?: Reward | null;
};

export type PointTransaction = {
  id: string;
  student_id: string;
  points: number;
  reason: string | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  type: 'trip' | 'football';
  title: string;
  description: string | null;
  activity_date: string;
  cost_per_person: number;
  total_cost: number;
  capacity: number | null;
  location: string | null;
  created_by: string | null;
  created_at: string;
};

export type ActivityParticipant = {
  id: string;
  activity_id: string;
  student_id: string;
  paid: boolean;
  amount: number;
  joined_at: string;
  student?: Pick<Student, 'id' | 'full_name'> | null;
};

export type GuardianRequest = {
  id: string;
  guardian_id: string;
  student_name_text: string;
  extra_info: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  resolved_student_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  guardian?: { id: string; display_name: string | null; phone: string | null; email: string | null } | null;
};

export type GuardianLink = {
  id: string;
  guardian_id: string;
  student_id: string;
  status: 'approved' | 'revoked';
  created_at: string;
  student?: Pick<Student, 'id' | 'full_name'> | null;
};
