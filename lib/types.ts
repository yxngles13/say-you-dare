export type RoomStatus = "lobby" | "active" | "ended";

export type Room = {
  id: string;
  code: string | null;
  name: string;
  host_key: string;
  status: RoomStatus;
  created_at: string;
};

export type Dare = {
  id: string;
  room_id: string;
  text: string;
  points: number;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  is_host: boolean;
  current_dare_id: string | null;
  created_at: string;
};

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  room_id: string;
  player_id: string;
  dare_id: string | null;
  dare_text: string;
  points: number;
  photo_path: string | null;
  witness_id: string | null;
  status: SubmissionStatus;
  created_at: string;
};

export type LeaderboardRow = {
  id: string;
  name: string;
  isHost: boolean;
  points: number;
  completed: number;
  rank: number;
};

export type FormState = { error?: string; message?: string } | undefined;

export type PollStatus = "draft" | "live" | "revealed";

export type Poll = {
  id: string;
  room_id: string;
  question: string;
  status: PollStatus;
  asked_at: string | null;
  revealed_at: string | null;
  created_at: string;
};
