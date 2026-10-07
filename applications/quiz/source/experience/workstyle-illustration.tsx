import { ArrowUpRight, Check, CircleDot, GitBranch, Users } from 'lucide-react';

export function WorkstyleIllustration() {
  return (
    <div
      className="workstyle-illustration"
      aria-label="From your team’s answers to a practical workstyle recommendation"
      role="img"
    >
      <div className="illustration-orbit orbit-one" />
      <div className="illustration-orbit orbit-two" />
      <div className="illustration-note">
        <span className="note-symbol">
          <Users />
        </span>
        <span>
          Built around
          <br />
          <strong>your people.</strong>
        </span>
      </div>
      <div className="illustration-paper">
        <div className="paper-top">
          <span className="mini-eyebrow">A LITTLE CLARITY</span>
          <ArrowUpRight />
        </div>
        <h2>
          Your team.
          <br />
          Your way of working.
        </h2>
        <div className="paper-line">
          <CircleDot />
          <span>How you work together</span>
          <Check />
        </div>
        <div className="paper-line">
          <CircleDot />
          <span>What needs to change</span>
          <Check />
        </div>
        <div className="paper-line">
          <CircleDot />
          <span>Where to start</span>
          <Check />
        </div>
        <div className="paper-result">
          <GitBranch />
          <div>
            <small>THE NEXT STEP</small>
            <strong>A plan that fits.</strong>
          </div>
        </div>
      </div>
      <span className="illustration-stamp">
        LESS GUESSWORK
        <br />
        <span>more direction</span>
      </span>
    </div>
  );
}
