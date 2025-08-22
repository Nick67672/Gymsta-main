import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView, Linking, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { Search, Mail, MessageSquare, HelpCircle, ChevronRight, ExternalLink } from 'lucide-react-native';
import { logEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

type Faq = { id: string; question: string; answer: string; category?: string };

export default function HelpAndSupportScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  // Search
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Faq[]>([]);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  // FAQs
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [expandedFaqIds, setExpandedFaqIds] = useState<Record<string, boolean>>({});
  const [loadingFaqs, setLoadingFaqs] = useState(false);

  // Contact form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<'Account' | 'Billing' | 'Technical' | 'Other' | ''>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // App/device info (auto-fill)
  const [meta, setMeta] = useState({ appVersion: '', buildNumber: '', os: Platform.OS, deviceModel: '', locale: '', timezone: '' });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    logEvent('help_opened');
    loadFaqs();
    loadMeta();
  }, []);

  const loadMeta = async () => {
    try {
      // Minimal, replace with expo-constants/device-info as needed
      const { manifest } = (global as any).expo || {};
      setMeta({
        appVersion: manifest?.version || 'unknown',
        buildNumber: manifest?.extra?.buildNumber || 'unknown',
        os: Platform.OS,
        deviceModel: Platform.constants?.Brand ? `${Platform.constants.Brand} ${Platform.constants.Model}` : 'unknown',
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      });
    } catch {
      // ignore
    }
  };

  const loadFaqs = async () => {
    try {
      setLoadingFaqs(true);
      const resp = await fetch('/api/help/faqs');
      const data: Faq[] = await resp.json();
      setFaqs(data);
    } catch (e) {
      // fallback: minimal FAQs
      setFaqs([
        { id: '1', question: 'How do I reset my password?', answer: 'Go to Settings → Security → Reset Password.' },
        { id: '2', question: 'How to change units?', answer: 'Settings → Weight Units, choose KG or LBS.' },
      ]);
    } finally {
      setLoadingFaqs(false);
    }
  };

  const onQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(text), 250);
  };

  const performSearch = async (text: string) => {
    const q = text.trim();
    if (!q) { setResults([]); return; }
    try {
      setSearching(true);
      logEvent('help_search_performed', { q });
      const resp = await fetch(`/api/help/search?q=${encodeURIComponent(q)}`);
      const data: Faq[] = await resp.json();
      setResults(data);
      setRecentQueries(prev => [q, ...prev.filter(x => x !== q)].slice(0, 5));
    } catch (e) {
      // network fallback: local filter
      const local = faqs.filter(f => f.question.toLowerCase().includes(q.toLowerCase()));
      setResults(local);
    } finally {
      setSearching(false);
    }
  };

  const toggleFaq = (id: string) => {
    setExpandedFaqIds(prev => ({ ...prev, [id]: !prev[id] }));
    logEvent('faq_viewed', { id });
  };

  const mailToSupport = () => {
    const subjectText = encodeURIComponent('Support request');
    const bodyText = encodeURIComponent(`Please describe your issue.\n\nMeta: ${JSON.stringify(meta)}`);
    Linking.openURL(`mailto:support@yourapp.com?subject=${subjectText}&body=${bodyText}`).catch(() => {
      Alert.alert('Unable to open mail app');
    });
  };

  const submitTicket = async () => {
    if (!name.trim() || !email.trim() || !category || !subject.trim() || !message.trim() || !consent) {
      Alert.alert('Please fix the highlighted fields.');
      return;
    }
    try {
      setSubmitting(true);
      logEvent('ticket_submitted', { category });
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { name, email, category, subject, message, meta, userId: user?.id };
      const resp = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('submit_failed');
      const { reference } = await resp.json();
      Alert.alert('Thanks! Your request was sent.', `Reference: ${reference}`);
      setSubject('');
      setMessage('');
    } catch (e) {
      Alert.alert('Connection issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Help & Support</Text>

        {/* Search */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={[styles.searchBar, { borderColor: colors.border }]}> 
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search help articles"
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={onQueryChange}
              accessibilityLabel="Search help"
            />
          </View>
          {searching ? (
            <ActivityIndicator color={colors.tint} style={{ marginTop: 8 }} />
          ) : results.length > 0 ? (
            results.map((r) => (
              <TouchableOpacity key={r.id} style={styles.resultItem} onPress={() => toggleFaq(r.id)}>
                <Text style={[styles.resultQuestion, { color: colors.text }]}>{r.question}</Text>
                {expandedFaqIds[r.id] && (
                  <Text style={[styles.resultAnswer, { color: colors.textSecondary }]}>{r.answer}</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            recentQueries.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Recent searches</Text>
                {recentQueries.map((q) => (
                  <TouchableOpacity key={q} onPress={() => { setQuery(q); performSearch(q); }}>
                    <Text style={{ color: colors.text }}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        </View>

        {/* Top FAQs */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <View style={styles.cardHeaderRow}>
            <HelpCircle size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top FAQs</Text>
          </View>
          {loadingFaqs ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            faqs.map(f => (
              <TouchableOpacity key={f.id} style={styles.faqItem} onPress={() => toggleFaq(f.id)}>
                <Text style={[styles.faqQuestion, { color: colors.text }]}>{f.question}</Text>
                {expandedFaqIds[f.id] && (
                  <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{f.answer}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Contact options */}
        <View style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Us</Text>
          <TouchableOpacity style={styles.linkRow} onPress={mailToSupport}>
            <Mail size={18} color={colors.textSecondary} />
            <Text style={[styles.linkText, { color: colors.text }]}>Email support@yourapp.com</Text>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Simple contact form */}
          <Text style={[styles.formLabel, { color: colors.text }]}>Name</Text>
          <TextInput value={name} onChangeText={setName} style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholder="Your name" placeholderTextColor={colors.textSecondary} />
          <Text style={[styles.formLabel, { color: colors.text }]}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.textSecondary} />
          <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
          <View style={styles.chipsRow}>
            {['Account','Billing','Technical','Other'].map((c) => (
              <TouchableOpacity key={c} onPress={() => setCategory(c as any)} style={[styles.chip, { borderColor: colors.border, backgroundColor: category === c ? colors.tint + '22' : 'transparent' }]}>
                <Text style={{ color: category === c ? colors.tint : colors.textSecondary }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.formLabel, { color: colors.text }]}>Subject</Text>
          <TextInput value={subject} onChangeText={setSubject} style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholder="Brief summary" placeholderTextColor={colors.textSecondary} maxLength={120} />
          <Text style={[styles.formLabel, { color: colors.text }]}>Message</Text>
          <TextInput value={message} onChangeText={setMessage} style={[styles.textarea, { color: colors.text, borderColor: colors.border }]} placeholder="Describe your issue" placeholderTextColor={colors.textSecondary} multiline maxLength={2000} />

          <TouchableOpacity onPress={() => setConsent(v => !v)} style={styles.checkboxRow} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
            <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: consent ? colors.tint : 'transparent' }]} />
            <Text style={{ color: colors.text, marginLeft: 8 }}>I agree to be contacted</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.button }]} onPress={submitTicket} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send</Text>}
          </TouchableOpacity>
        </View>

        {/* System status & version */}
        <View style={[styles.card, { backgroundColor: colors.card, marginBottom: Spacing.xl * 2 }]}> 
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://status.yourapp.com')}>
            <ExternalLink size={18} color={colors.textSecondary} />
            <Text style={[styles.linkText, { color: colors.text }]}>System Status</Text>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://yourapp.com/privacy')}>
            <ExternalLink size={18} color={colors.textSecondary} />
            <Text style={[styles.linkText, { color: colors.text }]}>Privacy Policy</Text>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://yourapp.com/terms')}>
            <ExternalLink size={18} color={colors.textSecondary} />
            <Text style={[styles.linkText, { color: colors.text }]}>Terms of Service</Text>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>App {meta.appVersion} ({meta.buildNumber}) • {meta.os}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  title: { ...Typography.h3, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.bodyLarge, fontWeight: '700', marginLeft: 6 },
  card: { borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput: { flex: 1, ...Typography.bodyMedium },
  resultItem: { paddingVertical: 10 },
  resultQuestion: { ...Typography.bodyMedium, fontWeight: '600' },
  resultAnswer: { marginTop: 4, ...Typography.bodySmall },
  faqItem: { paddingVertical: 10 },
  faqQuestion: { ...Typography.bodyMedium, fontWeight: '600' },
  faqAnswer: { marginTop: 4, ...Typography.bodySmall },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  linkText: { flex: 1, marginLeft: 8 },
  formLabel: { marginTop: Spacing.md },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  textarea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6, minHeight: 100, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1 },
  submitButton: { marginTop: Spacing.lg, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' },
});


