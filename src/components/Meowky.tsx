import type { SVGProps } from "react";

type MeowkyProps = SVGProps<SVGSVGElement> & { mood?: "happy" | "focused" | "sleepy"; level?: number };

export function Meowky({ mood = "happy", level = 1, ...props }: MeowkyProps) {\n  const evolution = level >= 20 ? "champion" : level >= 10 ? "scholar" : level >= 5 ? "adventurer" : "kitten";
  const eyes = mood === "sleepy"
    ? <><path d="M76 91q7 7 14 0M111 91q7 7 14 0" fill="none" stroke="#493d38" strokeWidth="4" strokeLinecap="round"/></>
    : <><ellipse cx="84" cy="89" rx="5.5" ry="8" fill="#493d38"/><ellipse cx="117" cy="89" rx="5.5" ry="8" fill="#493d38"/><circle cx="86" cy="86" r="2" fill="white"/><circle cx="119" cy="86" r="2" fill="white"/></>;
  return <svg viewBox="0 0 200 190" role="img" aria-label={mood === "focused" ? "Meowky, your focused study buddy" : mood === "sleepy" ? "Sleepy Meowky" : "Meowky, your cheerful cat study buddy"} xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="mk-fur" x1="35" y1="20" x2="155" y2="165" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFDF5"/><stop offset=".55" stopColor="#FFEBD0"/><stop offset="1" stopColor="#F5C99F"/></linearGradient>
      <linearGradient id="mk-ear" x1="58" y1="20" x2="80" y2="78" gradientUnits="userSpaceOnUse"><stop stopColor="#FFB69D"/><stop offset="1" stopColor="#F58C7A"/></linearGradient>
      <linearGradient id="mk-belly" x1="74" y1="110" x2="131" y2="174" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFDF7"/><stop offset="1" stopColor="#F8DDBD"/></linearGradient>
      <filter id="mk-shadow" x="10" y="8" width="180" height="180" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <ellipse cx="101" cy="166" rx="57" ry="12" fill="#172B42" opacity=".13" filter="url(#mk-shadow)"/>
    <path d="M52 71 47 25q-1-11 9-5l37 29M148 71l5-46q1-11-9-5l-37 29" fill="url(#mk-fur)" stroke="#E7C49F" strokeWidth="3" strokeLinejoin="round"/>
    <path d="m58 57-3-25 24 18M142 57l3-25-24 18" fill="url(#mk-ear)" opacity=".9"/>
    <ellipse cx="100" cy="104" rx="61" ry="62" fill="#D8B58F" opacity=".28"/>
    <path d="M44 96c0-35 24-61 56-61s56 26 56 61v38c0 22-23 37-56 37s-56-15-56-37V96Z" fill="url(#mk-fur)" stroke="#E8C9A7" strokeWidth="2.5"/>
    <path d="M53 119c10-14 25-18 47-18s37 4 47 18v22c0 17-19 28-47 28s-47-11-47-28v-22Z" fill="url(#mk-belly)" opacity=".8"/>
    <path d="M68 53q11-8 22-4M110 49q11-4 22 4" stroke="#E8B98F" strokeWidth="5" strokeLinecap="round" opacity=".8"/>
    <ellipse cx="67" cy="105" rx="11" ry="7" fill="#FFB5A0" opacity=".48"/><ellipse cx="133" cy="105" rx="11" ry="7" fill="#FFB5A0" opacity=".48"/>
    {eyes}
    <path d="m96 103 4 3 4-3q-4-5-8 0Z" fill="#E9897D"/>
    <path d="M100 107q-1 8-9 8m9-8q1 8 9 8" fill="none" stroke="#8B6657" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M53 109 31 105m23 13-22 4m115-13 22-4m-23 17 22 4" stroke="#C49B78" strokeWidth="1.7" strokeLinecap="round" opacity=".75"/>
    <path d="M79 140q21 14 42 0" fill="none" stroke="#E5BE98" strokeWidth="3" strokeLinecap="round" opacity=".75"/>
    <path d="M155 49l3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#42BFA7"/>
    <path d="M36 66l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#FF947A"/>\n    {evolution === "adventurer" && <path d="M64 45q36-22 72 0l-4 8q-32-17-64 0Z" fill="#42BFA7" stroke="#247D70" strokeWidth="2"/>}\n    {evolution === "scholar" && <><path d="M61 48 72 22l28 15 28-15 11 26q-39-15-78 0Z" fill="#FF947A" stroke="#D97968" strokeWidth="2"/><circle cx="100" cy="37" r="5" fill="#FFF4DF"/></>}\n    {evolution === "champion" && <><path d="m61 49 8-27 17 15 14-23 14 23 17-15 8 27q-39-15-78 0Z" fill="#F6C85F" stroke="#B98932" strokeWidth="2.5" strokeLinejoin="round"/><circle cx="100" cy="35" r="5" fill="#FF947A"/><path d="M155 77l4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#F6C85F"/></>}
    <ellipse cx="78" cy="64" rx="10" ry="4" fill="white" opacity=".42" transform="rotate(-28 78 64)"/>
  </svg>;
}
