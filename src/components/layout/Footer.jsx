import { HelpCircle } from 'lucide-react';

export default function Footer({ onHelp }) {
  return (
    <footer className="workspace-footer">
      <span>
        © 2026 <a href="https://www.technovahub.in">Powered by Technovahub</a>
      </span>
      <span>
        Made for the way you move. <span className="text-orange">✦</span>
      </span>
      <button className="text-link muted" onClick={() => onHelp()}>
        <HelpCircle size={14} />
        Help & support
      </button>
    </footer>
  );
}
