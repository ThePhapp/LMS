import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Search,
  Star,
  Users,
} from 'lucide-react';
import { assetUrl } from '../../services/api';

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="app-page-header">
      <div className="app-page-heading">
        {eyebrow && <p className="app-page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="app-page-actions">{action}</div>}
    </header>
  );
}

export function SectionHeader({ title, description, action }) {
  return (
    <header className="section-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="section-header-action">{action}</div>}
    </header>
  );
}

export function MetricCard({ icon: IconComponent, label, value, detail, tone = 'indigo' }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon metric-icon-${tone}`} aria-hidden="true">
        {React.createElement(IconComponent, { size: 18 })}
      </span>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </article>
  );
}

export function SearchField({ value, onChange, placeholder, label, className = '' }) {
  return (
    <label className={`app-search ${className}`.trim()}>
      <span className="sr-only">{label}</span>
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  );
}

export function FilterTabs({ label, value, options, onChange }) {
  return (
    <div className="filter-tabs" role="tablist" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? 'active' : ''}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.count !== undefined && <span>{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SelectMenu({ label, value, options, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className={`select-menu ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="select-menu-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div className="select-menu-popover" data-open={open ? 'true' : 'false'} role="listbox" aria-label={label} aria-hidden={!open}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            <span>{option.label}</span>
            {option.value === value && <Check size={15} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StatusBadge({ tone = 'neutral', children }) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function CourseCard({ course, actionLabel = 'Xem khóa học', compact = false, footer }) {
  const courseUrl = `/courses/${course.id}`;
  const lessonCount = Number(course.lesson_count || 0);
  const studentCount = Number(course.student_count || 0);
  const rating = Number(course.rating || 0);

  return (
    <article className={`course-tile ${compact ? 'course-tile-compact' : ''}`}>
      <Link to={courseUrl} className="course-tile-media" aria-label={`Mở khóa học ${course.title}`}>
        {course.thumbnail_url ? (
          <img src={assetUrl(course.thumbnail_url)} alt="" loading="lazy" />
        ) : (
          <GraduationCap size={38} strokeWidth={1.5} aria-hidden="true" />
        )}
        {course.category && <span className="course-tile-category">{course.category}</span>}
      </Link>
      <div className="course-tile-body">
        <div className="course-tile-heading">
          <h3><Link to={courseUrl}>{course.title}</Link></h3>
          {course.lecturer_name && <p>{course.lecturer_name}</p>}
        </div>
        {!compact && course.description && <p className="course-tile-description">{course.description}</p>}
        <div className="course-tile-meta">
          <span><BookOpen size={14} aria-hidden="true" />{lessonCount} bài</span>
          {studentCount > 0 && <span><Users size={14} aria-hidden="true" />{studentCount} học viên</span>}
          {rating > 0 && <span><Star size={14} aria-hidden="true" />{rating.toFixed(1)}</span>}
        </div>
        {footer || (
          <Link to={courseUrl} className="course-tile-action">
            {actionLabel}<ChevronRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

