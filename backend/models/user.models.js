import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    installation_id: {
      type: String,
      required: true,
      unique: true,
    },
    Subscription_Status: {
      type: String,
      required: true,
    },
    Repositories:[ {
      type: mongoose.Schema.Types.ObjectId,
      ref:'Repo'
    }],
  },
  { timestamps: true }
);
export const User = new mongoose.model('User', UserSchema);