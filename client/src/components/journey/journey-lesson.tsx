import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import "./journey-lesson.css";

export interface LessonSection {
    title: string;
    body: ReactNode;
}

/** Selection-specific explanation. Native disclosures keep the longer lesson optional. */
export function JourneyLesson({ title, summary, children, sections = [], footer }: {
    title: string;
    summary: string;
    children?: ReactNode;
    sections?: LessonSection[];
    footer?: ReactNode;
}) {
    const titleId = useId();
    return (
        <section className="aqv-lesson" aria-labelledby={titleId}>
            <div className="aqv-lesson-heading">
                <span className="aqv-lesson-marker" aria-hidden="true" />
                <h4 id={titleId}>{title}</h4>
            </div>
            <p className="aqv-lesson-summary">{summary}</p>
            {children && <div className="aqv-lesson-demo">{children}</div>}
            {sections.length > 0 && <div className="aqv-lesson-sections">
                {sections.map((section) => <details key={section.title} className="aqv-lesson-detail">
                    <summary><span>{section.title}</span><ChevronDown size={16} aria-hidden="true" /></summary>
                    <div className="aqv-lesson-body">{section.body}</div>
                </details>)}
            </div>}
            {footer && <div className="aqv-lesson-footer">{footer}</div>}
        </section>
    );
}

/** Real buttons, usable by touch and keyboard; deliberately not incomplete ARIA tabs. */
export function LessonChoices({ label, options, value, onChange }: {
    label: string;
    options: ReadonlyArray<{ id: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
}) {
    return <div className="aqv-lesson-choices" role="group" aria-label={label}>
        {options.map((option) => <button type="button" key={option.id}
            aria-pressed={value === option.id} onClick={() => onChange(option.id)}>
            {option.label}
        </button>)}
    </div>;
}

export function LessonSource({ label, sources }: {
    label: string;
    sources: ReadonlyArray<{ label: string; href: string }>;
}) {
    return <details className="aqv-lesson-source">
        <summary>{label}</summary>
        <ul>{sources.map((source) => <li key={source.href}>
            <a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a>
        </li>)}</ul>
    </details>;
}
