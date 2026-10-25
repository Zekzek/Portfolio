// Filter groups shown in the sidebar, in display order.
// `rating` is 1-5 (shown as a meter); omit it for subject-matter tags.
// Within a group, skills are sorted by rating, then time, then name (see lib/durations.ts).
export interface Skill {
  key: string;
  label: string;
  rating?: number;
}
export interface SkillGroup {
  label: string;
  skills: Skill[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    label: "Subject Matter",
    skills: [
      { key: "game", label: "Games" },
      { key: "tools", label: "Tools" },
      { key: "defense", label: "Defense" },
    ],
  },
  {
    label: "Languages",
    skills: [
      { key: "csharp", label: "C#", rating: 5 },
      { key: "java", label: "Java", rating: 3 },
      { key: "js", label: "Javascript", rating: 4 },
      { key: "c", label: "C/C++", rating: 2 },
      { key: "python", label: "Python", rating: 4 },
    ],
  },
  {
    label: "Engines & IDEs",
    skills: [
      { key: "unity", label: "Unity", rating: 5 },
      { key: "vs", label: "Visual Studio", rating: 4 },
      { key: "intellij", label: "IntelliJ", rating: 4 },
      { key: "eclipse", label: "Eclipse", rating: 4 },
      { key: "gamemaker", label: "Gamemaker", rating: 2 },
    ],
  },
  {
    label: "Version Control",
    skills: [
      { key: "git", label: "git", rating: 4 },
      { key: "perforce", label: "Perforce", rating: 4 },
      { key: "clearcase", label: "Clearcase", rating: 1 },
    ],
  },
  {
    label: "Data & Cloud Services",
    skills: [
      { key: "bigquery", label: "BigQuery", rating: 3 },
      { key: "sql", label: "SQL", rating: 3 },
      { key: "mongo", label: "MongoDB", rating: 2 },
      { key: "redis", label: "Redis", rating: 2 },
      { key: "aws", label: "AWS", rating: 3 },
    ],
  },
  {
    label: "CI/CD & Project Management",
    skills: [
      { key: "jira", label: "Jira", rating: 4 },
      { key: "jenkins", label: "Jenkins", rating: 4 },
      { key: "teamcity", label: "TeamCity", rating: 4 },
      { key: "rally", label: "Rally", rating: 3 },
    ],
  },
];

export const SKILLS = SKILL_GROUPS.flatMap((g) => g.skills);
export const SKILL_KEYS = SKILLS.map((s) => s.key);
export const SKILL_LABEL = Object.fromEntries(SKILLS.map((s) => [s.key, s.label]));

/** Filters switched on when the page loads. */
export const DEFAULT_FILTERS = ["game", "tools"];

/** Sections left out of time totals and the years-of-experience count. */
export const EXCLUDED_FROM_TOTALS = ["personal", "school"];
