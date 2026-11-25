import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  X, Printer, Edit, Copy, Check, School, Building2, Calendar, MapPin,
  Phone, Mail, Globe, Shield, BookOpen, Award, FileText, CheckCircle2,
  GraduationCap, Sparkles, ExternalLink, Users, Layers, CreditCard,
  DollarSign, Clock, AlertCircle
} from 'lucide-react';
import { Utility } from '../utility';
import { useNavigate } from '@/lib/routerAdapter';

const SchoolDossierModal = ({
  open,
  setOpen,
  detail,
  countryData = [],
  stateData = [],
  cityData = [],
  allClasses = [],
  allSections = [],
  allSubjects = [],
  allAmenities = [],
  allPaymentMethods = [],
  rolePriority = 1,
}) => {
  const [activeTab, setActiveTab] = useState('register');
  const [copiedField, setCopiedField] = useState(null);

  const navigateTo = useNavigate();
  const { findById, appendSuffix, capitalizeEveryWord } = Utility();

  const handleClose = () => {
    setOpen(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (open) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Reset tab on open
  useEffect(() => {
    if (open) {
      setActiveTab('register');
    }
  }, [open]);

  const school = detail?.schoolData?.schoolData || detail?.schoolData || detail || {};
  const address = detail?.addressData || {};
  const images = Array.isArray(detail?.imageData)
    ? detail.imageData
    : (detail?.imageData ? [detail.imageData] : []);
  const classMappings = detail?.schoolData?.selectedClass || detail?.selectedClass || [];

  // Display logo and banner image
  const displayImage = images.find(img => img.type === 'display') || images[0] || null;
  const bannerImage = images.find(img => img.type === 'banner') || null;
  const logoSrc = displayImage?.image_src || null;
  const bannerSrc = bannerImage?.image_src || null;

  // Resolved Location Names
  const countryName = findById(address?.country, countryData)?.name || address?.country || 'India';
  const stateName = findById(address?.state, stateData)?.name || address?.state || '';
  const cityName = findById(address?.city, cityData)?.name || address?.city || '';

  // Formatted Full Address
  const fullAddress = useMemo(() => {
    const parts = [
      address?.street,
      address?.landmark ? `Near ${address.landmark}` : null,
      cityName,
      stateName,
      countryName,
      address?.zipcode ? `PIN: ${address.zipcode}` : null
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Address not registered';
  }, [address, cityName, stateName, countryName]);

  // Copy helper
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    if (school?.id) {
      setOpen(false);
      navigateTo(`/school/update/${school.id}`, { state: { id: school.id } });
    }
  };

  // Resolved Amenities List
  const resolvedAmenitiesList = useMemo(() => {
    if (!school?.amenities) return [];
    let list = [];
    if (Array.isArray(school.amenities)) {
      list = school.amenities;
    } else if (typeof school.amenities === 'string') {
      try {
        const parsed = JSON.parse(school.amenities);
        list = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        list = school.amenities.split(',').map(s => s.trim());
      }
    }
    return list.map((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        return item.name || item.title || `Amenity ${idx + 1}`;
      }
      const found = allAmenities.find(a => String(a.id) === String(item));
      return found ? found.name : String(item);
    });
  }, [school?.amenities, allAmenities]);

  // Resolved Payment Methods List
  const resolvedPaymentMethodsList = useMemo(() => {
    if (!school?.payment_methods) return [];
    let list = [];
    if (Array.isArray(school.payment_methods)) {
      list = school.payment_methods;
    } else if (typeof school.payment_methods === 'string') {
      try {
        const parsed = JSON.parse(school.payment_methods);
        list = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        list = school.payment_methods.split(',').map(s => s.trim());
      }
    }
    return list.map((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        return item.name || `Method ${idx + 1}`;
      }
      const found = allPaymentMethods.find(m => String(m.id) === String(item));
      return found ? found.name : String(item);
    });
  }, [school?.payment_methods, allPaymentMethods]);

  // Resolved Classes & Sections Breakdown
  const resolvedClassesBreakdown = useMemo(() => {
    if (!classMappings || !classMappings.length) return [];
    return classMappings.map((row, idx) => {
      const classId = row.class_id ?? row.id;
      const sectionId = row.section_id;
      const foundClass = allClasses.find(c => (c.class_id ?? c.id) == classId);
      const rawClassName = row.class_name || foundClass?.class_name || foundClass?.name || String(classId);
      const formattedClassName = !isNaN(Number(rawClassName)) && rawClassName !== ''
        ? `Class ${appendSuffix(rawClassName)}`
        : capitalizeEveryWord(rawClassName);

      const foundSection = allSections.find(s => (s.section_id ?? s.id) == sectionId);
      const rawSecName = row.section_name || foundSection?.section_name || foundSection?.name || String(sectionId || '');
      const formattedSecName = rawSecName ? capitalizeEveryWord(rawSecName) : '-';

      // Subjects
      let subjects = [];
      if (row.subject_ids) {
        const ids = String(row.subject_ids).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        subjects = ids.map(subId => {
          const foundSub = allSubjects.find(s => (s.id ?? s.subject_id) == subId);
          return foundSub?.name || `Subject ${subId}`;
        });
      }

      return {
        key: `class-row-${idx}`,
        className: formattedClassName,
        sectionName: formattedSecName,
        fee: row.class_fee ? `₹${Number(row.class_fee).toLocaleString('en-IN')}` : '₹0',
        capacity: row.class_capacity || '-',
        lateFee: row.late_fee ? `₹${Number(row.late_fee).toLocaleString('en-IN')}` : '₹0',
        lateFeeDuration: row.late_fee_duration ? `${row.late_fee_duration} Days` : '-',
        subjects
      };
    });
  }, [classMappings, allClasses, allSections, allSubjects]);

  if (!open) return null;

  return (
    <>
      {/* GLOBAL PRINT STYLES FOR SCHOOL DOSSIER */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body > * {
            visibility: hidden !important;
          }
          #school-dossier-print-root,
          #school-dossier-print-root * {
            visibility: visible !important;
          }
          #school-dossier-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
          }
        }
      `}</style>

      {/* PRINT-ONLY DOSSIER DOCUMENT */}
      <div id="school-dossier-print-root" className="hidden print:block p-4 text-slate-900 bg-white">
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
          <div className="flex items-center gap-4">
            {logoSrc ? (
              <img src={logoSrc} alt="School Logo" className="w-16 h-16 rounded-xl object-contain border border-slate-300 p-1" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-300 font-bold text-slate-600">
                SCH
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight uppercase">{school?.name || 'School Name'}</h1>
              <p className="text-xs text-slate-600 font-medium">
                Official Institutional Registry Dossier & Academic Profile
              </p>
              <p className="text-xs font-mono text-slate-700 mt-1">
                School Code: #{school?.school_code || 'SCH1000'} | Board: {school?.board || 'CBSE'} | Affiliation No: {school?.affiliation_no || 'N/A'}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 border border-slate-300">
              {school?.status || 'Active'}
            </span>
            <p className="text-[10px] text-slate-500 mt-1">Printed on {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        {/* Print Summary Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-slate-200 rounded-lg p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-100 pb-1">Administration</h3>
            <div className="space-y-1 text-xs">
              <p><span className="font-semibold text-slate-600">Director:</span> {school?.director || 'Not Specified'}</p>
              <p><span className="font-semibold text-slate-600">Principal:</span> {school?.principal || 'Not Specified'}</p>
              <p><span className="font-semibold text-slate-600">Phone:</span> {school?.contact_no_1 || 'N/A'} {school?.contact_no_2 ? `/ ${school?.contact_no_2}` : ''}</p>
              <p><span className="font-semibold text-slate-600">Email:</span> {school?.email || 'N/A'}</p>
              <p><span className="font-semibold text-slate-600">Website:</span> {school?.website || 'N/A'}</p>
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-100 pb-1">Institutional Particulars</h3>
            <div className="space-y-1 text-xs">
              <p><span className="font-semibold text-slate-600">Medium:</span> {school?.medium || 'English'}</p>
              <p><span className="font-semibold text-slate-600">Institution Type:</span> {capitalizeEveryWord(school?.type?.replace(/_/g, ' ')) || 'Co-ed'}</p>
              <p><span className="font-semibold text-slate-600">Sub Type:</span> {capitalizeEveryWord(school?.sub_type?.replace(/_/g, ' ')) || 'Senior Sec'}</p>
              <p><span className="font-semibold text-slate-600">Campus Capacity:</span> {school?.capacity || 'N/A'} Students</p>
              <p><span className="font-semibold text-slate-600">Founding Year:</span> {school?.founding_year || school?.registration_year || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Print Address */}
        <div className="border border-slate-200 rounded-lg p-3 mb-6 text-xs">
          <h3 className="font-bold uppercase tracking-wider text-slate-500 mb-1">Campus Location & Address</h3>
          <p className="font-medium text-slate-800">{fullAddress}</p>
        </div>

        {/* Print Classes & Fee Structure Table */}
        {resolvedClassesBreakdown.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Classes & Fee Structure Breakdown</h3>
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-1.5 text-left">Class</th>
                  <th className="border border-slate-300 p-1.5 text-left">Section</th>
                  <th className="border border-slate-300 p-1.5 text-right">Tuition Fee</th>
                  <th className="border border-slate-300 p-1.5 text-center">Capacity</th>
                  <th className="border border-slate-300 p-1.5 text-right">Late Fee</th>
                  <th className="border border-slate-300 p-1.5 text-left">Affiliated Subjects</th>
                </tr>
              </thead>
              <tbody>
                {resolvedClassesBreakdown.map((row) => (
                  <tr key={row.key}>
                    <td className="border border-slate-300 p-1.5 font-bold">{row.className}</td>
                    <td className="border border-slate-300 p-1.5">{row.sectionName}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{row.fee}</td>
                    <td className="border border-slate-300 p-1.5 text-center">{row.capacity}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{row.lateFee} ({row.lateFeeDuration})</td>
                    <td className="border border-slate-300 p-1.5 text-[10px]">{row.subjects.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Print Footer / Signatures */}
        <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between items-end text-xs">
          <div className="text-center w-48">
            <div className="border-b border-slate-400 pb-1 mb-1 font-mono text-[10px]">VERIFIED REGISTRY RECORD</div>
            <p className="font-semibold text-slate-700">Registrar / Admin Desk</p>
          </div>
          <div className="text-center w-48 border border-dashed border-slate-300 h-24 flex items-center justify-center text-slate-400 text-[10px]">
            Official Institutional Stamp
          </div>
          <div className="text-center w-48">
            <div className="border-b border-slate-400 pb-1 mb-1 font-mono text-[10px]">{school?.principal || 'Principal'}</div>
            <p className="font-semibold text-slate-700">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* SCREEN INTERACTIVE DOSSIER MODAL */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-5 print:hidden animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#111] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
          
          {/* HEADER SECTION WITH HERO BANNER */}
          <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 overflow-hidden shrink-0">
            {bannerSrc && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-[1px]"
                style={{ backgroundImage: `url(${bannerSrc})` }}
              />
            )}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top Toolbar */}
            <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {school?.status || 'Active'}
                </span>
                <span className="font-mono text-xs text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                  #{school?.school_code || `SCH${school?.id || '1000'}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer border border-white/10"
                  title="Print School Dossier"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-sm"
                  title="Edit School"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* School Profile Hero */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={school?.name}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-contain bg-white dark:bg-slate-900 border-2 border-white/20 p-1.5 shadow-lg shrink-0"
                  />
                ) : (
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-emerald-600/20 text-emerald-400 border-2 border-emerald-500/30 flex items-center justify-center font-bold text-xl shadow-lg shrink-0">
                    <Building2 className="w-9 h-9" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                    {capitalizeEveryWord(school?.name) || 'School Profile'}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    Board: {school?.board || 'CBSE'}
                  </span>
                  <span>•</span>
                  <span>Type: {capitalizeEveryWord(school?.type?.replace(/_/g, ' ')) || 'Co-Ed'}</span>
                  <span>•</span>
                  <span>Sub Type: {capitalizeEveryWord(school?.sub_type?.replace(/_/g, ' ')) || 'Senior Sec'}</span>
                  {cityName && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        {cityName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="relative z-10 flex items-center gap-1 mt-5 pt-3 border-t border-white/10 overflow-x-auto no-scrollbar">
              {[
                { id: 'register', label: 'Institutional Profile', icon: Building2 },
                { id: 'classes', label: `Classes & Offerings (${resolvedClassesBreakdown.length})`, icon: BookOpen },
                { id: 'amenities', label: `Campus Amenities (${resolvedAmenitiesList.length})`, icon: Sparkles },
                { id: 'contact', label: 'Location & Contacts', icon: MapPin },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB CONTENTS (SCROLLABLE BODY) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 dark:bg-[#0c0c0c] space-y-5">
            
            {/* TAB 1: INSTITUTIONAL PROFILE */}
            {activeTab === 'register' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* 4 Metric Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-[#161616] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Established</span>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {school?.founding_year || school?.registration_year || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#161616] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Capacity</span>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {school?.capacity ? `${Number(school.capacity).toLocaleString('en-IN')} Students` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#161616] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Board Affiliation</span>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {school?.board || 'CBSE'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#161616] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Classes Configured</span>
                    <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                      {resolvedClassesBreakdown.length} Classes
                    </p>
                  </div>
                </div>

                {/* Administration Team */}
                <div className="bg-white dark:bg-[#161616] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Key Administrative Leadership
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1f1f1f] border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Principal</span>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {school?.principal || 'Not Specified'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-emerald-500" />
                        {school?.contact_no_1 || 'No Phone Registered'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1f1f1f] border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Director</span>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {school?.director || 'Not Specified'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-blue-500" />
                        {school?.email || 'No Email Registered'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Institutional Registry Fields Grid */}
                <div className="bg-white dark:bg-[#161616] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Institutional Registry Specifics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">School Code</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                        #{school?.school_code || 'SCH1000'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Affiliation Number</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {school?.affiliation_no || 'Not Assigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Medium of Instruction</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {capitalizeEveryWord(school?.medium) || 'English'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Type</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {capitalizeEveryWord(school?.type?.replace(/_/g, ' ')) || 'Co-Ed'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Sub Type</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {capitalizeEveryWord(school?.sub_type?.replace(/_/g, ' ')) || 'Senior Sec'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Academic Session Start</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {school?.session_start ? String(school.session_start) : 'April'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Boarding Facility</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {school?.is_boarding ? `Yes (Capacity: ${school.boarding_capacity || 'N/A'})` : 'No (Day Scholar)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Min Student Login Class</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {school?.student_login_min_class ? `Class ${school.student_login_min_class} & Above` : 'All Classes'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Registered By</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {school?.registered_by || 'Admin Registry'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ACADEMIC CLASSES & OFFERINGS */}
            {activeTab === 'classes' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {resolvedClassesBreakdown.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-[#161616] rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No classes mapped for this school yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Configure classes, sections, and fee structures in school edit.</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-500" />
                        Affiliated Classes, Sections & Fee Structures
                      </h3>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                        {resolvedClassesBreakdown.length} Total Sections
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50/75 dark:bg-[#1f1f1f] border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">Class</th>
                            <th className="py-3 px-4">Section</th>
                            <th className="py-3 px-4 text-right">Tuition Fee</th>
                            <th className="py-3 px-4 text-center">Capacity</th>
                            <th className="py-3 px-4 text-right">Late Fee</th>
                            <th className="py-3 px-4">Affiliated Subjects</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {resolvedClassesBreakdown.map((row) => (
                            <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-[#1c1c1c] transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                                {row.className}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                                {row.sectionName}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {row.fee}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono text-xs">
                                  {row.capacity}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-500">
                                {row.lateFee} <span className="text-[10px] text-slate-400">({row.lateFeeDuration})</span>
                              </td>
                              <td className="py-3 px-4">
                                {row.subjects.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {row.subjects.map((sub, sIdx) => (
                                      <span
                                        key={sIdx}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40"
                                      >
                                        {sub}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">None</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CAMPUS AMENITIES & FACILITIES */}
            {activeTab === 'amenities' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Amenities Grid */}
                <div className="bg-white dark:bg-[#161616] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Active Campus Facilities & Amenities
                    </h3>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/50">
                      {resolvedAmenitiesList.length} Amenities
                    </span>
                  </div>

                  {resolvedAmenitiesList.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No specific amenities linked to this school profile.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {resolvedAmenitiesList.map((amenity, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#1c1c1c] border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                        >
                          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="truncate">{capitalizeEveryWord(amenity)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accepted Payment Modes */}
                <div className="bg-white dark:bg-[#161616] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    Fee Payment Methods Accepted
                  </h3>
                  {resolvedPaymentMethodsList.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No specific payment modes designated. Default methods (Cash / Online) apply.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {resolvedPaymentMethodsList.map((method, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50"
                        >
                          <DollarSign className="w-3 h-3" />
                          {capitalizeEveryWord(method)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: LOCATION & CONTACTS */}
            {activeTab === 'contact' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Official Address Card */}
                <div className="bg-white dark:bg-[#161616] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      Physical Campus Location
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopy(fullAddress, 'address')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {copiedField === 'address' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {fullAddress}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a1a]">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">City</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cityName || '-'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a1a]">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">State</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{stateName || '-'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a1a]">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Country</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{countryName || 'India'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a1a]">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">PIN Code</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{address?.zipcode || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Communications Hub */}
                <div className="bg-white dark:bg-[#161616] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    Direct Official Communication Channels
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <a
                      href={`tel:${school?.contact_no_1 || ''}`}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] border border-slate-100 dark:border-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">Primary Contact Phone</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {school?.contact_no_1 || 'Not Specified'}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>

                    <a
                      href={`tel:${school?.contact_no_2 || ''}`}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] border border-slate-100 dark:border-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">Secondary Contact Phone</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {school?.contact_no_2 || 'Not Specified'}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>

                    <a
                      href={`mailto:${school?.email || ''}`}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] border border-slate-100 dark:border-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-bold block">Official Email</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                            {school?.email || 'Not Specified'}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </a>

                    <a
                      href={school?.website?.startsWith('http') ? school.website : `https://${school?.website || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] border border-slate-100 dark:border-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-bold block">Web Portal</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                            {school?.website || 'Not Specified'}
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="p-4 bg-white dark:bg-[#111] border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs shrink-0">
            <span className="text-slate-400">
              Registered ID: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">#{school?.id || 'N/A'}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1c1c1c] hover:bg-slate-200 dark:hover:bg-[#252525] rounded-xl transition-colors cursor-pointer"
              >
                Print Dossier
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

SchoolDossierModal.propTypes = {
  open: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
  detail: PropTypes.object,
  countryData: PropTypes.array,
  stateData: PropTypes.array,
  cityData: PropTypes.array,
  allClasses: PropTypes.array,
  allSections: PropTypes.array,
  allSubjects: PropTypes.array,
  allAmenities: PropTypes.array,
  allPaymentMethods: PropTypes.array,
  rolePriority: PropTypes.number,
};

export default SchoolDossierModal;
