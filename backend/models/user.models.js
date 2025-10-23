import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
      unique: true,
    },
    Subscription_Status: {
      type: String,
      default: 'Free',
    },
    Repositories:[ {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Repo'
    }],
  },
  { timestamps: true }
);
export const User = new mongoose.model('User', UserSchema);