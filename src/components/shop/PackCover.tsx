import { Icon } from "@/components/ui/Icon";
import type { IconName, Tone } from "@/content/packs";

// Visuel PROVISOIRE généré en CSS. À remplacer par la couverture officielle du pack.
export function PackCover({ icon, tone, stacked = true, className = "" }: { icon: IconName; tone: Tone; stacked?: boolean; className?: string }) {
  return (
    <div className={`cover cover--${tone} ${className}`} aria-hidden="true">
      {stacked ? <div className="cover__stack" /> : null}
      <div className="cover__sheet">
        <div className="cover__icon">
          <Icon name={icon} />
        </div>
        <div className="cover__line cover__line--title" />
        <div className="cover__line" />
        <div className="cover__line cover__line--short" />
        <div className="cover__line" />
      </div>
    </div>
  );
}
