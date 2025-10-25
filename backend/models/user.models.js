import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    user_id: {   //target id of user
      type: Number,
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
export const User =mongoose.model('User', UserSchema);