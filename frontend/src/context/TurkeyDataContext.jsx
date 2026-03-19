import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const TurkeyDataContext = createContext(null);

import { TURKEY_DEPARTMENTS_URL, TURKEY_UNIVERSITIES_URL } from '../data/turkeySources';

const STORAGE_KEY = 'birivar_tr_data_v1';
const STORAGE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 gün

function normalizeTurkish(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('İ', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugifyUniversityName(name) {
  return normalizeTurkish(name)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.json();
}

export function TurkeyDataProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [universities, setUniversities] = useState([]); // [{ name, code }]
  const [departments, setDepartments] = useState([]); // [{ universityCode, name }]

  const [selectedUniversity, setSelectedUniversity] = useState(null); // { name, code } | null
  const [selectedDepartment, setSelectedDepartment] = useState(null); // string | null (department name)
  const [feedQuery, setFeedQuery] = useState(''); // Trending'den gelen serbest filtre
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [universitySearch, setUniversitySearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (
              parsed?.fetchedAt &&
              Date.now() - parsed.fetchedAt < STORAGE_TTL_MS &&
              Array.isArray(parsed.universities) &&
              Array.isArray(parsed.departments)
            ) {
              if (!cancelled) {
                setUniversities(parsed.universities);
                setDepartments(parsed.departments);
                setLoading(false);
              }
              return;
            }
          } catch {
            // ignore
          }
        }

        const [uniJson, depJson] = await Promise.all([
          fetchJson(TURKEY_UNIVERSITIES_URL),
          fetchJson(TURKEY_DEPARTMENTS_URL),
        ]);

        const uniList = (uniJson?.universiteler || [])
          .map((u) => {
            const name = u?.universiteAdi || '';
            const code = slugifyUniversityName(name);
            return { name, code };
          })
          .filter((u) => u.name && u.code);

        const depList = (Array.isArray(depJson) ? depJson : [])
          .map((d) => ({
            universityCode: d?.universityCode || '',
            name: d?.name || '',
          }))
          .filter((d) => d.universityCode && d.name);

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ fetchedAt: Date.now(), universities: uniList, departments: depList })
        );

        if (!cancelled) {
          setUniversities(uniList);
          setDepartments(depList);
        }
      } catch (e) {
        if (!cancelled) setError('Üniversite/Bölüm listesi yüklenemedi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUniversities = useMemo(() => {
    const q = normalizeTurkish(universitySearch);
    if (!q) return universities;
    return universities.filter((u) => normalizeTurkish(u.name).includes(q));
  }, [universities, universitySearch]);

  const filteredDepartments = useMemo(() => {
    const base = selectedUniversity
      ? departments.filter((d) => d.universityCode === selectedUniversity.code)
      : departments;

    const q = normalizeTurkish(departmentSearch);

    // (1) normalize + uniq
    const seen = new Set();
    const unique = [];
    for (const d of base) {
      const cleanName = String(d?.name || '').trim();
      const key = normalizeTurkish(cleanName);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({ ...d, name: cleanName });
    }

    // (2) optional filter by search
    const filtered = q
      ? unique.filter((d) => normalizeTurkish(d.name).includes(q))
      : unique;

    // (3) alphabetical sort (locale-aware)
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));
    return filtered;
  }, [departments, selectedUniversity, departmentSearch]);

  const value = useMemo(
    () => ({
      loading,
      error,
      universities,
      departments,
      filteredUniversities,
      filteredDepartments,
      selectedUniversity,
      setSelectedUniversity,
      selectedDepartment,
      setSelectedDepartment,
      feedQuery,
      setFeedQuery,
      universitySearch,
      setUniversitySearch,
      departmentSearch,
      setDepartmentSearch,
      clearFilters: () => {
        setSelectedUniversity(null);
        setSelectedDepartment(null);
        setFeedQuery('');
        setUniversitySearch('');
        setDepartmentSearch('');
      },
    }),
    [
      loading,
      error,
      universities,
      departments,
      filteredUniversities,
      filteredDepartments,
      selectedUniversity,
      selectedDepartment,
      feedQuery,
      universitySearch,
      departmentSearch,
    ]
  );

  return <TurkeyDataContext.Provider value={value}>{children}</TurkeyDataContext.Provider>;
}

export function useTurkeyData() {
  const ctx = useContext(TurkeyDataContext);
  if (!ctx) throw new Error('useTurkeyData must be used within TurkeyDataProvider');
  return ctx;
}

