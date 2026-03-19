import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select';
import { useTurkeyData } from '../context/TurkeyDataContext';

const Register = () => {
  const navigate = useNavigate();
  const { loading: turkeyLoading, error: turkeyError, universities, filteredDepartments } = useTurkeyData();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUniversityOption, setSelectedUniversityOption] = useState(null); // { value, label, code }
  const [selectedDepartmentOption, setSelectedDepartmentOption] = useState(null); // { value, label }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const universityOptions = useMemo(() => {
    const list = Array.isArray(universities) ? universities : [];
    const copy = [...list].filter((u) => u?.name).sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }));
    return copy.map((u) => ({ value: u.name, label: u.name, code: u.code }));
  }, [universities]);

  const departmentOptions = useMemo(() => {
    const list = Array.isArray(filteredDepartments) ? filteredDepartments : [];
    const names = list
      .map((d) => String(d?.name || '').trim())
      .filter(Boolean);
    // filteredDepartments zaten tekilleştiriliyor; yine de güvenli olalım
    const seen = new Set();
    const unique = [];
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(name);
    }
    unique.sort((a, b) => a.localeCompare(b, 'tr', { sensitivity: 'base' }));
    return unique.map((name) => ({ value: name, label: name }));
  }, [filteredDepartments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (turkeyLoading) {
      setError('Liste yükleniyor, lütfen bekleyin.');
      return;
    }

    if (turkeyError) {
      setError('Üniversite/Bölüm listesi yüklenemedi. Lütfen sayfayı yenileyin.');
      return;
    }

    if (!selectedUniversityOption) {
      setError('Lütfen listeden bir üniversite seçin.');
      return;
    }

    if (!selectedDepartmentOption) {
      setError('Lütfen listeden bir bölüm seçin.');
      return;
    }

    // Seçimler dataset stringleriyle birebir gönderilir
    const university = selectedUniversityOption.value;
    const department = selectedDepartmentOption.value;

    setLoading(true);
    try {
      await axios.post('/api/auth/register', {
        username,
        email,
        password,
        university,
        department,
      });
      navigate('/login');
    } catch (err) {
      setError(err?.response?.data?.message || 'Kayıt oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <h1 className="text-xl font-bold text-slate-100 text-center mb-6">
          BiriVar
        </h1>
        <p className="text-slate-400 text-sm text-center mb-4">Yeni hesap oluştur</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Kullanıcı adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              placeholder="kullaniciadi"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              placeholder="ornek@mail.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Üniversite</label>
            <Select
              classNamePrefix="sc-select"
              isSearchable
              isClearable
              isLoading={turkeyLoading}
              options={universityOptions}
              value={selectedUniversityOption}
              onChange={(opt) => {
                setSelectedUniversityOption(opt || null);
                setSelectedDepartmentOption(null);
              }}
              placeholder={turkeyLoading ? 'Yükleniyor...' : 'Üniversite seçin'}
              noOptionsMessage={() => 'Lütfen listeden bir seçim yapın'}
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: '#020617',
                  borderColor: state.isFocused ? '#334155' : '#334155',
                  boxShadow: 'none',
                  minHeight: 38,
                }),
                menu: (base) => ({ ...base, backgroundColor: '#0b1220', border: '1px solid #1f2937' }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? '#111827' : '#0b1220',
                  color: '#e2e8f0',
                }),
                singleValue: (base) => ({ ...base, color: '#e2e8f0' }),
                input: (base) => ({ ...base, color: '#e2e8f0' }),
                placeholder: (base) => ({ ...base, color: '#94a3b8' }),
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Bölüm</label>
            <Select
              classNamePrefix="sc-select"
              isSearchable
              isClearable
              isDisabled={!selectedUniversityOption || turkeyLoading || Boolean(turkeyError)}
              isLoading={turkeyLoading}
              options={departmentOptions}
              value={selectedDepartmentOption}
              onChange={(opt) => setSelectedDepartmentOption(opt || null)}
              placeholder={
                turkeyLoading
                  ? 'Yükleniyor...'
                  : !selectedUniversityOption
                    ? 'Önce üniversite seçin'
                    : 'Bölüm seçin'
              }
              noOptionsMessage={() => 'Lütfen listeden bir seçim yapın'}
              styles={{
                control: (base, state) => ({
                  ...base,
                  backgroundColor: '#020617',
                  borderColor: state.isFocused ? '#334155' : '#334155',
                  boxShadow: 'none',
                  minHeight: 38,
                  opacity: !selectedUniversityOption ? 0.65 : 1,
                }),
                menu: (base) => ({ ...base, backgroundColor: '#0b1220', border: '1px solid #1f2937' }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? '#111827' : '#0b1220',
                  color: '#e2e8f0',
                }),
                singleValue: (base) => ({ ...base, color: '#e2e8f0' }),
                input: (base) => ({ ...base, color: '#e2e8f0' }),
                placeholder: (base) => ({ ...base, color: '#94a3b8' }),
              }}
            />
          </div>
          {turkeyError && <p className="text-sm text-red-400">{turkeyError}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 text-slate-950 font-semibold py-2 text-sm transition"
          >
            {loading ? 'Kaydediliyor...' : 'Kayıt ol'}
          </button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-4">
          Zaten hesabın var?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
