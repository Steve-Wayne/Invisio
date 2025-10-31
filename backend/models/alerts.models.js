import mongoose from 'mongoose';

const AlertFixSchema = new mongoose.Schema(
  {
    alertNumber: {
      type: Number,
      required: true,
    },
    commitSha: {
      type: String
    },
    fixCommit: {
      type: Boolean,
      default: false,
    },
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repo',
    },
  },
  { timestamps: true }
);

export const Alerts = mongoose.model('Alerts', AlertFixSchema);
