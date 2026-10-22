import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gamepad2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Phone,
  User,
  CreditCard,
  Mail,
  Loader2,
  Copy,
  QrCode,
  UploadCloud,
  X,
  Banknote,
} from 'lucide-react';
import {
  TRACKS_CONFIG,
  YEARS_OPTIONS,
  EMAIL_CONFIG,
  EVENT_METADATA,
  PAYMENT_CONFIG,
} from '../config/eventConfig';
import { RegistrationSteps } from '../components/RegistrationSteps';
import { TicketRecoveryForm } from '../components/TicketRecoveryForm';
import { blobToDataUrl, compressPaymentImage } from '../utils/compressPaymentImage';
import confetti from 'canvas-confetti';

const getInitialFormData = () => {
  const defaults = {
    fullName: '',
    phone: '',
    campusId: '',
    campusEmail: '',
    year: '1st Year',
    selection: [],
    honeypot: '',
  };

  try {
    const saved = JSON.parse(sessionStorage.getItem('proxima_eclash_form') || '{}');
    return {
      ...defaults,
      fullName: typeof saved.fullName === 'string' ? saved.fullName : defaults.fullName,
      phone: typeof saved.phone === 'string' ? saved.phone : defaults.phone,
      campusId: typeof saved.campusId === 'string' ? saved.campusId : defaults.campusId,
      campusEmail: typeof saved.campusEmail === 'string' ? saved.campusEmail : defaults.campusEmail,
      year: typeof saved.year === 'string' ? saved.year : defaults.year,
      selection: Array.isArray(saved.selection) ? saved.selection : defaults.selection,
    };
  } catch {
    return defaults;
  }
};

export const RegistrationPage = ({ onBack, onSuccess }) => {
  const trackConfig = TRACKS_CONFIG.eclash;
  const normalizeSelectionValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  // Form State
  const [formData, setFormData] = useState(getInitialFormData);
  const [flowStep, setFlowStep] = useState('details');

  // Validation Errors State
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailAutoFilled, setEmailAutoFilled] = useState(() =>
    Boolean(
      formData.campusId &&
      formData.campusEmail === `${formData.campusId.trim().toLowerCase().replace(/\s+/g, '')}@${EMAIL_CONFIG.ALLOWED_EMAIL_DOMAIN}`
    )
  );
  const [apiError, setApiError] = useState(null);
  const [paymentMode, setPaymentMode] = useState('UPI'); // 'UPI' | 'CASH'
  const [utr, setUtr] = useState('');
  const [paymentImage, setPaymentImage] = useState('');
  const [imageError, setImageError] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copyMessage, setCopyMessage] = useState('');
  const [isQrAvailable, setIsQrAvailable] = useState(true);
  const [isQrZoomed, setIsQrZoomed] = useState(false);

  React.useEffect(() => {
    try {
      sessionStorage.setItem(
        'proxima_eclash_form',
        JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          campusId: formData.campusId,
          campusEmail: formData.campusEmail,
          year: formData.year,
          selection: formData.selection,
        })
      );
    } catch (error) {
      console.warn('Could not save registration details for this session:', error);
    }
  }, [formData]);

  // Auto-fill Campus Email when Campus ID is typed
  const handleCampusIdChange = (e) => {
    const val = e.target.value.trimStart();
    const updatedForm = { ...formData, campusId: val };

    if (!touched.campusEmail || emailAutoFilled) {
      if (val.trim()) {
        const cleanId = val.trim().toLowerCase().replace(/\s+/g, '');
        updatedForm.campusEmail = `${cleanId}@${EMAIL_CONFIG.ALLOWED_EMAIL_DOMAIN}`;
        setEmailAutoFilled(true);
      } else {
        updatedForm.campusEmail = '';
        setEmailAutoFilled(false);
      }
    }

    setFormData(updatedForm);
    validateField('campusId', val);
    if (updatedForm.campusEmail) {
      validateField('campusEmail', updatedForm.campusEmail, val);
    }
  };

  // Field validation rules
  const validateField = (fieldName, value, idContext = null) => {
    let err = '';
    const currentId = idContext !== null ? idContext : formData.campusId;

    switch (fieldName) {
      case 'fullName':
        if (!value.trim()) {
          err = 'Full Name is required.';
        } else if (value.trim().length < 2) {
          err = 'Name must be at least 2 characters.';
        } else if (!/^[a-zA-Z\s.'-]+$/.test(value.trim())) {
          err = 'Name should only contain letters and spaces.';
        }
        break;

      case 'phone':
        if (!value.trim()) {
          err = 'Phone number is required.';
        } else if (!/^[6-9]\d{9}$/.test(value.trim())) {
          err = 'Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).';
        }
        break;

      case 'campusId':
        if (!value.trim()) {
          err = `Campus ID is required (e.g., ${EMAIL_CONFIG.EXAMPLE_CAMPUS_ID}).`;
        } else if (value.trim().length < 3) {
          err = 'Campus ID is too short.';
        }
        break;

      case 'campusEmail':
        const cleanEmail = value.trim().toLowerCase();
        if (!cleanEmail) {
          err = 'Campus Email is required.';
        } else {
          const emailParts = cleanEmail.split('@');
          if (emailParts.length !== 2 || emailParts[1] !== EMAIL_CONFIG.ALLOWED_EMAIL_DOMAIN) {
            err = `Email must end with @${EMAIL_CONFIG.ALLOWED_EMAIL_DOMAIN}`;
          } else if (EMAIL_CONFIG.REQUIRE_EMAIL_PREFIX_MATCH && currentId.trim()) {
            const expectedPrefix = currentId.trim().toLowerCase().replace(/\s+/g, '');
            if (emailParts[0] !== expectedPrefix) {
              err = `Email username '${emailParts[0]}' must match your Campus ID '${expectedPrefix}'`;
            }
          }
        }
        break;

      case 'selection': {
        const selectedGames = normalizeSelectionValue(value);

        if (selectedGames.length === 0) {
          err = 'Please select 1 or 2 tournament games.';
          break;
        }

        if (selectedGames.length > 2) {
          err = 'You can select at most 2 games.';
          break;
        }
        break;
      }

      default:
        break;
    }

    setErrors((prev) => {
      const updated = { ...prev };
      if (err) {
        updated[fieldName] = err;
      } else {
        delete updated[fieldName];
      }
      return updated;
    });

    return err;
  };

  // Blur handler to mark field as touched
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Generic change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'campusEmail') {
      setEmailAutoFilled(false);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleSelectionToggle = (gameName) => {
    setTouched((prev) => ({ ...prev, selection: true }));
    setFormData((prev) => {
      const currentSelection = normalizeSelectionValue(prev.selection);
      const isSelected = currentSelection.includes(gameName);

      if (isSelected) {
        const nextSelection = currentSelection.filter((game) => game !== gameName);
        validateField('selection', nextSelection);
        return { ...prev, selection: nextSelection };
      }

      if (currentSelection.length >= 2) {
        const errorMessage = 'You can only select up to 2 games. Deselect one to choose another.';
        setErrors((prevErrors) => ({ ...prevErrors, selection: errorMessage }));
        return prev;
      }

      const nextSelection = [...currentSelection, gameName];
      validateField('selection', nextSelection);
      return { ...prev, selection: nextSelection };
    });
  };

  const handleDetailsContinue = (e) => {
    e.preventDefault();
    setApiError(null);

    if (formData.honeypot) {
      console.warn('Spam submission blocked.');
      return;
    }

    const allFields = ['fullName', 'phone', 'campusId', 'campusEmail', 'selection'];
    const nextTouched = {};
    let hasErrors = false;

    allFields.forEach((field) => {
      nextTouched[field] = true;
      if (validateField(field, field === 'selection' ? formData.selection : formData[field])) {
        hasErrors = true;
      }
    });
    setTouched(nextTouched);

    if (hasErrors) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setFlowStep('pay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImageError('');
    setIsProcessingImage(true);
    setPaymentImage('');
    try {
      const compressedImage = await compressPaymentImage(file);
      setPaymentImage(await blobToDataUrl(compressedImage));
    } catch (error) {
      setImageError(error.message || 'Could not process this screenshot.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_CONFIG.UPI_ID);
      setCopyMessage('UPI ID copied.');
    } catch {
      setCopyMessage('Copy is unavailable here. Please select the UPI ID manually.');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    const cleanUtr = utr.trim();
    if (paymentMode === 'UPI') {
      if (!/^\d{12}$/.test(cleanUtr) || !paymentImage || !agreeToTerms || isProcessingImage) {
        setApiError('Enter a 12-digit UTR, attach a payment screenshot, and accept the payment terms.');
        return;
      }
    } else {
      if (!agreeToTerms || isProcessingImage) {
        setApiError('Please accept the payment terms before submitting your registration.');
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const selectedGames = normalizeSelectionValue(formData.selection);
      const payload = JSON.stringify({
        ...formData,
        selection: selectedGames,
        paymentMode,
        utr: paymentMode === 'UPI' ? cleanUtr : undefined,
        paymentScreenshot: paymentMode === 'UPI' ? paymentImage : undefined,
        agreeToTerms,
      });
      const result = await new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', '/api/register');
        request.setRequestHeader('Content-Type', 'application/json');
        request.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          }
        });
        request.addEventListener('load', () => {
          let responseData = null;
          try {
            responseData = JSON.parse(request.responseText);
          } catch {
            responseData = null;
          }
          if (request.status >= 200 && request.status < 300) {
            resolve(responseData);
          } else {
            const fieldError = responseData?.validationErrors
              ? Object.values(responseData.validationErrors)[0]
              : '';
            reject(new Error(
              fieldError ||
              responseData?.error ||
              `We could not submit your payment proof (HTTP ${request.status}). Please try again.`
            ));
          }
        });
        request.addEventListener('error', () => reject(new Error('Network error while submitting proof. Check your connection and retry.')));
        request.addEventListener('abort', () => reject(new Error('Submission was interrupted. Please retry.')));
        request.send(payload);
      });

      if (!result?.registrationId || !result?.qrToken) {
        throw new Error('The server did not return a valid ticket. Please contact the organizer before retrying.');
      }

      const submissionResult = {
        ...formData,
        track: 'eclash',
        registrationId: result.registrationId,
        qrToken: result.qrToken,
        registeredAt: result.registeredAt || new Date().toISOString(),
        game: selectedGames.join(', '),
        selection: selectedGames.join(', '),
        games: selectedGames,
        paymentMode: result.details?.paymentMode || paymentMode,
        paymentStatus: result.details?.paymentStatus || 'PENDING',
        status: result.details?.status || (paymentMode === 'CASH' ? 'PENDING' : 'CONFIRMED'),
        paymentUtr: paymentMode === 'UPI' ? cleanUtr : null,
        paymentAmount: result.details?.paymentAmount || PAYMENT_CONFIG.ENTRY_FEE,
      };

      sessionStorage.removeItem('proxima_eclash_form');
      setPaymentImage('');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00e5ff', '#2b4bff', '#7c3aed', '#ffffff'],
      });
      onSuccess(submissionResult);
    } catch (error) {
      setApiError(error.message || 'Could not complete the payment submission. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const selectedGames = normalizeSelectionValue(formData.selection);
  const cleanUtr = utr.trim();
  const isUtrValid = /^\d{12}$/.test(cleanUtr);
  const upiPayUri = `upi://pay?${new URLSearchParams({
    pa: PAYMENT_CONFIG.UPI_ID,
    pn: PAYMENT_CONFIG.UPI_PAYEE_NAME,
    am: String(PAYMENT_CONFIG.ENTRY_FEE),
    cu: 'INR',
    tn: `PROXIMA ${formData.campusId.trim()}`,
  }).toString()}`;

  return (
    <div className="min-h-screen py-5 sm:py-10 px-3 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-center bg-[#040618] text-slate-100">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-[#00e5ff]/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#7c3aed]/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0, 229, 255, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(43, 75, 255, 0.15) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="max-w-3xl mx-auto w-full relative z-10 my-auto">
        {/* Back Navigation Button */}
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 mb-4 sm:mb-6 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all shadow-md active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tournament Overview</span>
        </button>

        {/* Header Block */}
        <div className="text-center space-y-2 sm:space-y-3 mb-5 sm:mb-8">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl overflow-hidden p-[1.5px] bg-gradient-to-tr from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] shadow-[0_0_25px_rgba(0,229,255,0.45)]">
            <img
              src="/proxima-logo.png"
              alt="PROXIMA 2026 Logo"
              className="w-full h-full object-cover rounded-[14px]"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
            <span className="bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 px-3.5 py-1.5 rounded-full flex items-center gap-2 font-mono">
              <Gamepad2 className="w-4 h-4" />
              PROXIMA E-CLASH 2026 🎮
            </span>
          </div>

          <h1 className="text-xl min-[360px]:text-2xl sm:text-4xl md:text-5xl font-black tracking-wide font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-[#00e5ff] drop-shadow-[0_0_25px_rgba(0,229,255,0.6)]">
            Tournament Player Registration
          </h1>

          <p className="text-xs sm:text-sm max-w-xl mx-auto text-slate-300 font-rajdhani">
            Enter the battlefield for Free Fire, BGMI, Mini Militia, eFootball or Carrom. Compete for campus glory.
          </p>

          <div className="text-[10px] sm:text-[11px] font-mono text-cyan-300/80 pt-1 leading-relaxed">
            <span>Hosted by <strong>{EVENT_METADATA.school}</strong> • {EVENT_METADATA.dates}</span>
          </div>
        </div>

        {/* Registration Glass Form Card */}
        <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-10 border border-[#00e5ff]/35 shadow-neon-blue backdrop-blur-xl bg-[#090e38]/90">
          <form
            onSubmit={flowStep === 'details' ? handleDetailsContinue : handlePaymentSubmit}
            noValidate
            className="space-y-5 sm:space-y-6"
          >
            <RegistrationSteps currentStep={flowStep} />
            {/* API Error Alert Banner */}
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-red-950/80 border border-red-500/70 text-red-100 flex items-start gap-3 shadow-[0_0_20px_rgba(239,68,68,0.35)]"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-300 font-mono">
                    Registration Alert
                  </p>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">{apiError}</p>
                </div>
              </motion.div>
            )}

            {flowStep === 'details' ? (
              <div className="space-y-6">
            {/* Honeypot anti-spam field */}
            <input
              type="text"
              name="honeypot"
              value={formData.honeypot}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
            />

            {/* Field 1: Full Name */}
            <div className="space-y-1.5" data-error={errors.fullName && touched.fullName ? 'true' : 'false'}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                1. Full Name (as per Student ID) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  name="fullName"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('fullName')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    errors.fullName && touched.fullName
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'bg-black/40 border-white/20 text-white placeholder:text-slate-500 focus:border-[#00e5ff] focus:ring-2 focus:ring-[#00e5ff]/30'
                  }`}
                />
              </div>
              {errors.fullName && touched.fullName && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Field 2: Phone Number */}
            <div className="space-y-1.5" data-error={errors.phone && touched.phone ? 'true' : 'false'}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                2. Mobile Number (10 Digits) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  name="phone"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={() => handleBlur('phone')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-mono transition-all ${
                    errors.phone && touched.phone
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'bg-black/40 border-white/20 text-white placeholder:text-slate-500 focus:border-[#00e5ff] focus:ring-2 focus:ring-[#00e5ff]/30'
                  }`}
                />
              </div>
              {errors.phone && touched.phone && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Field 3: Campus ID */}
            <div className="space-y-1.5" data-error={errors.campusId && touched.campusId ? 'true' : 'false'}>
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-0.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                  3. Yenepoya Campus ID <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] font-mono text-cyan-300">
                  Example: {EMAIL_CONFIG.EXAMPLE_CAMPUS_ID}
                </span>
              </div>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  name="campusId"
                  placeholder={`e.g. ${EMAIL_CONFIG.EXAMPLE_CAMPUS_ID}`}
                  value={formData.campusId}
                  onChange={handleCampusIdChange}
                  onBlur={() => handleBlur('campusId')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-mono uppercase transition-all ${
                    errors.campusId && touched.campusId
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'bg-black/40 border-white/20 text-white placeholder:text-slate-500 focus:border-[#00e5ff] focus:ring-2 focus:ring-[#00e5ff]/30'
                  }`}
                />
              </div>
              {errors.campusId && touched.campusId && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.campusId}
                </p>
              )}
            </div>

            {/* Field 4: Campus Email */}
            <div className="space-y-1.5" data-error={errors.campusEmail && touched.campusEmail ? 'true' : 'false'}>
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-0.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                  4. Campus Email Address <span className="text-red-400">*</span>
                </label>
                {emailAutoFilled && (
                  <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-filled from ID
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  name="campusEmail"
                  placeholder={EMAIL_CONFIG.PLACEHOLDER}
                  value={formData.campusEmail}
                  onChange={handleChange}
                  onBlur={() => handleBlur('campusEmail')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-mono transition-all ${
                    errors.campusEmail && touched.campusEmail
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'bg-black/40 border-white/20 text-white placeholder:text-slate-500 focus:border-[#00e5ff] focus:ring-2 focus:ring-[#00e5ff]/30'
                  }`}
                />
              </div>
              {errors.campusEmail && touched.campusEmail ? (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.campusEmail}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Rule: Must match your Campus ID followed by <span className="font-mono text-cyan-300">@{EMAIL_CONFIG.ALLOWED_EMAIL_DOMAIN}</span> (e.g. <span className="font-mono text-slate-300">{EMAIL_CONFIG.PLACEHOLDER}</span>)
                </p>
              )}
            </div>

            {/* Field 5: Year of Study (Radio Buttons) */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                5. Year of Study <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {YEARS_OPTIONS.map((yr) => (
                  <label
                    key={yr.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      formData.year === yr.id
                        ? 'bg-[#00e5ff]/20 border-[#00e5ff] shadow-neon-blue text-white font-bold'
                        : 'bg-black/30 border-white/10 hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="year"
                      value={yr.id}
                      checked={formData.year === yr.id}
                      onChange={handleChange}
                      className="accent-cyan-400 w-4 h-4"
                    />
                    <span className="text-xs sm:text-sm">{yr.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Field 6: Game Selection */}
            <div className="space-y-2 pt-1" data-error={errors.selection && touched.selection ? 'true' : 'false'}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                  6. Select Tournament Game(s) <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
                  {selectedGames.length}/2 Selected
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4 space-y-3">
                <div className={`rounded-xl border px-3 py-2 text-[11px] font-mono transition-all ${
                  selectedGames.length === 0
                    ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
                    : selectedGames.length >= 1 && selectedGames.length <= 2
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-400/60 bg-red-500/10 text-red-200'
                }`}>
                  {selectedGames.length === 0 && 'Rule: Choose 1 game or 2 games (maximum 2 games allowed).'}
                  {selectedGames.length === 1 && `✓ 1 game selected: ${selectedGames[0]} (Valid! You can proceed to payment, or optionally select 1 more game).`}
                  {selectedGames.length === 2 && `✓ 2 games selected: ${selectedGames.join(' & ')} (Maximum 2 games reached).`}
                  {selectedGames.length > 2 && 'You can select at most 2 games. Please deselect one.'}
                </div>

                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 sm:gap-3">
                  {trackConfig.options.map((option) => {
                    const game = option.name;
                    const isSelected = selectedGames.includes(game);

                    return (
                      <label
                        key={game}
                        className={`flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#00e5ff]/20 border-[#00e5ff] shadow-neon-blue text-white font-bold'
                            : 'bg-black/30 border-white/10 hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="selection"
                          value={game}
                          checked={isSelected}
                          onChange={() => handleSelectionToggle(game)}
                          disabled={!isSelected && selectedGames.length >= 2}
                          className="accent-cyan-400 w-4 h-4 mt-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-bold font-orbitron truncate">{game}</div>
                          <div className="text-[11px] text-cyan-300 font-rajdhani truncate">
                            {option.type || 'Tournament Game'} • {option.platform || 'Mobile'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {errors.selection && touched.selection && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.selection}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl font-black font-orbitron text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl bg-gradient-to-r from-[#00e5ff] via-[#2b4bff] to-[#7c3aed] text-white shadow-neon-blue hover:brightness-110 active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Continue to Payment</span>
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                By submitting, you confirm that you are an active Yenepoya student adhering to the official tournament rules and mobile-only policy.
              </p>
            </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 to-blue-500/10 p-4 sm:p-5 text-center">
                  <p className="text-[11px] uppercase tracking-[0.18em] font-mono text-cyan-200">Entry Fee</p>
                  <p className="mt-1 text-4xl sm:text-5xl font-black font-orbitron text-white">
                    ₹{PAYMENT_CONFIG.ENTRY_FEE}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">Same entry fee for all selected games</p>
                </div>

                {/* Payment Mode Selector Tabs */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Payment Method <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode('UPI');
                        setApiError(null);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                        paymentMode === 'UPI'
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(0,229,255,0.2)]'
                          : 'bg-black/30 border-white/10 hover:border-white/20 text-slate-400'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl border ${paymentMode === 'UPI' ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-bold font-orbitron ${paymentMode === 'UPI' ? 'text-white' : 'text-slate-300'}`}>
                          UPI Online
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">Scan QR / Any UPI App</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode('CASH');
                        setApiError(null);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                        paymentMode === 'CASH'
                          ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-400 ring-2 ring-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                          : 'bg-black/30 border-white/10 hover:border-white/20 text-slate-400'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl border ${paymentMode === 'CASH' ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-bold font-orbitron ${paymentMode === 'CASH' ? 'text-white' : 'text-slate-300'}`}>
                          Cash Payment
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">Volunteers collect ₹50 cash</p>
                      </div>
                    </button>
                  </div>
                </div>

                {paymentMode === 'UPI' ? (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5 space-y-4">
                      <div className="flex items-center gap-2 text-cyan-200">
                        <QrCode className="w-4 h-4" />
                        <h2 className="text-sm font-bold font-orbitron">Pay by UPI QR</h2>
                      </div>

                      <div className="flex justify-center">
                        {isQrAvailable ? (
                          <button
                            type="button"
                            onClick={() => setIsQrZoomed(true)}
                            className="group rounded-2xl border border-cyan-300/30 bg-white p-2 shadow-[0_0_25px_rgba(0,229,255,0.14)] focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            aria-label="Enlarge UPI payment QR code"
                          >
                            <img
                              src={PAYMENT_CONFIG.QR_IMAGE_PATH}
                              alt="UPI payment QR code"
                              onError={() => setIsQrAvailable(false)}
                              className="h-56 w-56 sm:h-72 sm:w-72 object-contain"
                            />
                            <span className="block pt-1 text-center text-[10px] font-mono text-slate-600 group-hover:text-slate-900">
                              Tap to enlarge
                            </span>
                          </button>
                        ) : (
                          <div
                            role="status"
                            className="flex min-h-56 w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300/50 bg-amber-400/5 px-5 text-center"
                          >
                            <QrCode className="mb-3 h-9 w-9 text-amber-200" />
                            <p className="text-sm font-bold text-amber-100">Payment QR not available yet</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-300">
                              The organizer will add the QR image at <code className="text-cyan-200">/public/payment/upi-qr.jpeg</code>.
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-center text-xs text-slate-300">
                        You can screenshot this QR or scan it from another phone.
                      </p>

                      <div className="rounded-xl border border-white/10 bg-[#05071a]/80 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">UPI ID</p>
                            <p className="break-all font-mono font-bold text-cyan-200">{PAYMENT_CONFIG.UPI_ID}</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyUpiId}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-100 hover:bg-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                          >
                            <Copy className="h-4 w-4" />
                            Copy
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-300">
                          Payee: <span className="font-semibold text-white">{PAYMENT_CONFIG.UPI_PAYEE_NAME}</span>
                        </p>
                        {copyMessage && <p role="status" className="mt-2 text-xs text-emerald-300">{copyMessage}</p>}
                      </div>

                      <a
                        href={upiPayUri}
                        className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-black text-[#04120b] shadow-lg shadow-emerald-900/30 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:hidden"
                      >
                        Pay with UPI app
                      </a>
                    </div>

                    <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-3 text-sm font-semibold leading-relaxed text-cyan-100">
                      Pay ₹{PAYMENT_CONFIG.ENTRY_FEE}, then upload the payment screenshot and enter the UTR / Transaction ID below.
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="payment-utr" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                        UTR / Transaction ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="payment-utr"
                        name="utr"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={12}
                        value={utr}
                        onChange={(event) => setUtr(event.target.value)}
                        aria-invalid={Boolean(cleanUtr) && !isUtrValid}
                        aria-describedby="payment-utr-help payment-utr-error"
                        placeholder="Enter 12-digit UTR"
                        className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-base font-mono text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                      />
                      <p id="payment-utr-help" className="text-[11px] leading-relaxed text-slate-400">
                        Find it in your payment app’s transaction details: Google Pay (Transaction ID), PhonePe (UTR), or Paytm (UPI Ref. No.). Enter 12 digits.
                      </p>
                      {Boolean(cleanUtr) && !isUtrValid && (
                        <p id="payment-utr-error" role="alert" className="text-xs text-red-300">
                          Enter exactly 12 digits. Spaces at the beginning or end are ignored.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                        Payment Screenshot <span className="text-red-400">*</span>
                      </label>
                      <p className="text-[11px] text-slate-400">JPG, PNG, or WebP • Maximum original size 5 MB • compressed before submission</p>
                      {paymentImage ? (
                        <div className="overflow-hidden rounded-xl border border-emerald-400/30 bg-black/30">
                          <img src={paymentImage} alt="Compressed payment screenshot preview" className="max-h-64 w-full object-contain" />
                          <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
                            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-100 hover:bg-cyan-400/20 focus-within:ring-2 focus-within:ring-cyan-300">
                              <UploadCloud className="h-4 w-4" />
                              Replace screenshot
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handlePaymentImageChange}
                                className="sr-only"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentImage('');
                                setImageError('');
                              }}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-300/30 bg-red-400/10 px-3 text-xs font-bold text-red-200 hover:bg-red-400/20 focus:outline-none focus:ring-2 focus:ring-red-300"
                            >
                              <X className="h-4 w-4" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-black/20 px-4 py-5 text-center text-sm text-slate-200 hover:border-cyan-300 hover:bg-cyan-400/5 focus-within:ring-2 focus-within:ring-cyan-300">
                          {isProcessingImage ? (
                            <>
                              <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
                              <span>Optimizing screenshot…</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="h-6 w-6 text-cyan-300" />
                              <span className="font-semibold">Choose screenshot or take a photo</span>
                              <span className="text-[11px] text-slate-400">Camera and gallery options are available on mobile</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePaymentImageChange}
                            disabled={isProcessingImage}
                            className="sr-only"
                          />
                        </label>
                      )}
                      {isProcessingImage && (
                        <div role="status" className="space-y-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-300 motion-reduce:animate-none" />
                          </div>
                          <p className="text-[11px] text-cyan-200">Compressing image to under 1 MB…</p>
                        </div>
                      )}
                      {imageError && <p role="alert" className="text-xs text-red-300">{imageError}</p>}
                    </div>
                  </>
                ) : (
                  /* Cash Collection by Volunteers View */
                  <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-emerald-950/30 via-[#06141a]/60 to-[#030d12]/80 p-5 space-y-4 shadow-lg shadow-emerald-950/30">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-md">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold font-orbitron text-white">Cash Payment Selected</h3>
                        <p className="text-xs text-emerald-300 font-mono">Volunteers will collect ₹{PAYMENT_CONFIG.ENTRY_FEE} in person</p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-300 bg-black/40 p-4 rounded-xl border border-white/10">
                      <p className="font-semibold text-white">How Cash Payment Works:</p>
                      <ul className="space-y-2 list-disc list-inside text-slate-300">
                        <li>You get successfully registered immediately and receive your player pass.</li>
                        <li>Tournament volunteers will come to you to collect the <span className="font-bold text-white">₹{PAYMENT_CONFIG.ENTRY_FEE}</span> cash payment.</li>
                        <li>Your registration status will remain <span className="font-mono font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">PENDING</span> until the admin accepts the payment.</li>
                        <li>Once the admin marks the payment as accepted, your tournament status will change to <span className="font-mono font-bold text-emerald-300 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">CONFIRMED</span>!</li>
                      </ul>
                      <p className="text-[11px] text-cyan-300/90 pt-1 font-mono">
                        ✓ No transaction screenshot or UTR number required for cash entries.
                      </p>
                    </div>
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3.5 focus-within:ring-2 focus-within:ring-cyan-300">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(event) => setAgreeToTerms(event.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-cyan-400"
                  />
                  <span className="text-xs leading-relaxed text-slate-200">
                    I agree that {PAYMENT_CONFIG.PAYMENT_TERMS_TEXT.toLowerCase()}. <span className="text-red-400">*</span>
                  </span>
                </label>

                {isSubmitting && (
                  <div role="status" aria-live="polite" className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                      Submitting, please don’t close this page…
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 transition-[width] duration-200 motion-reduce:transition-none"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] font-mono text-cyan-200">{uploadProgress}% uploaded</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFlowStep('details');
                      setApiError(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={isSubmitting}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to details
                  </button>
                  <button
                    type="submit"
                    disabled={
                      paymentMode === 'UPI'
                        ? (!isUtrValid || !paymentImage || !agreeToTerms || isProcessingImage || isSubmitting)
                        : (!agreeToTerms || isSubmitting)
                    }
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-600 to-violet-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-neon-blue hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                        Submitting…
                      </>
                    ) : paymentMode === 'CASH' ? (
                      <>
                        <Banknote className="h-4 w-4" />
                        Register with Cash &amp; Get Ticket
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Submit &amp; Get Ticket
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
        {flowStep === 'details' && <TicketRecoveryForm onSuccess={onSuccess} />}
      </div>

      {isQrZoomed && isQrAvailable && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged UPI payment QR code"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsQrZoomed(false)}
        >
          <div className="relative max-h-full max-w-full rounded-2xl bg-white p-3" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsQrZoomed(false)}
              className="absolute -right-2 -top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
              aria-label="Close enlarged QR code"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={PAYMENT_CONFIG.QR_IMAGE_PATH}
              alt="Enlarged UPI payment QR code"
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
          </div>
        </div>
      )}

      {/* Footer attribution */}
      <div className="text-center text-xs text-slate-400 mt-10">
        PROXIMA 2026 • Yenepoya School of Engineering and Technology
      </div>
    </div>
  );
};
