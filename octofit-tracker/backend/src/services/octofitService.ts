import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

type ActivityInput = {
  userId?: unknown;
  teamId?: unknown;
  type?: unknown;
  minutes?: unknown;
  occurredAt?: unknown;
};

type TeamInput = {
  name?: unknown;
  mascot?: unknown;
  members?: unknown;
};

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.isValidObjectId(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') throw httpError(400, 'Activity details are required');
  const { userId, teamId, type, minutes, occurredAt } = input as ActivityInput;
  if (!isObjectId(userId) || !isObjectId(teamId)) throw httpError(400, 'Valid userId and teamId are required');
  if (typeof type !== 'string' || !type.trim()) throw httpError(400, 'Activity type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) throw httpError(400, 'Minutes must be a positive number');

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw httpError(404, 'Activity user or team was not found');
  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim().toLowerCase(),
    minutes,
    points: Math.round(minutes),
    occurredAt: occurredAt === undefined ? new Date() : occurredAt,
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') throw httpError(400, 'Team details are required');
  const { name, mascot, members = [] } = input as TeamInput;
  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim()) {
    throw httpError(400, 'Team name and mascot are required');
  }
  if (!Array.isArray(members) || !members.every(isObjectId)) throw httpError(400, 'Members must be valid user IDs');
  const users = members.length ? await User.find({ _id: { $in: members } }) : [];
  if (users.length !== members.length) throw httpError(404, 'One or more team members were not found');
  return Team.create({ name: name.trim(), mascot: mascot.trim(), members });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail });
  if (!user) throw httpError(404, 'User was not found');
  const [workouts, activities] = await Promise.all([
    Workout.find().lean(),
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).lean(),
  ]);
  const activityFocus = new Set(activities.map(({ type }) => {
    if (type === 'run' || type === 'cycle') return 'endurance';
    if (type === 'strength') return 'strength';
    if (type === 'walk') return 'mobility';
    return type;
  }));
  return workouts
    .map((workout) => {
      const goalMatch = workout.focus.toLowerCase() === user.fitnessGoal.toLowerCase();
      const activityMatch = activityFocus.has(workout.focus.toLowerCase());
      const reason = goalMatch
        ? `Matches your ${user.fitnessGoal} fitness goal`
        : activityMatch
          ? `Based on your recent ${workout.focus} activity`
          : `A ${workout.focus} workout to broaden your routine`;
      return { ...workout, reason, score: Number(goalMatch) * 2 + Number(activityMatch) };
    })
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .map(({ score: _score, ...workout }) => workout);
}

export { User };
