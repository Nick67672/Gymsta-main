import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/Spacing';
import { goBack } from '@/lib/goBack';
import { pickVideoFromLibrary } from '@/lib/imagePickerUtils';
import { Video, ResizeMode } from 'expo-av';
import { analyzeExerciseFormFromVideo } from '@/lib/geminiFormAnalyzer';

export default function AiHubScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<Video | null>(null);

  const handlePickVideo = async () => {
    const uri = await pickVideoFromLibrary({ quality: 1 });
    if (uri) {
      setVideoUri(uri);
      setAnalysis(null);
    }
  };

  const handleAnalyze = async () => {
    if (!videoUri || isAnalyzing) return;
    setIsAnalyzing(true);
    const result = await analyzeExerciseFormFromVideo(videoUri);
    if (result.ok) {
      setAnalysis(result.text || '');
    } else {
      setAnalysis(result.error || 'Analysis failed.');
    }
    setIsAnalyzing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI Hub</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#7C3AED', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.iconCircle}>
            <Sparkles size={48} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>AI Hub</Text>
          <Text style={styles.heroSubtitle}>
            Correct your form with AI-powered video analysis and get real-time feedback.
          </Text>
        </LinearGradient>

        {/* Coming soon card for parity with other hubs */}
        <View style={[styles.actionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Get Started</Text>
          <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>Pick a training video to analyze your form.</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePickVideo}
            style={styles.pickButton}
          >
            <LinearGradient
              colors={['#7C3AED', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pickButtonBg}
            >
              <Sparkles size={18} color="#fff" />
              <Text style={styles.pickButtonText}>Pick a video</Text>
            </LinearGradient>
          </TouchableOpacity>

          {videoUri && (
            <View style={styles.previewContainer}>
              <Video
                ref={videoRef}
                style={styles.video}
                source={{ uri: videoUri }}
                isLooping
                useNativeControls
                isMuted
                resizeMode={ResizeMode.CONTAIN}
                onError={(e) => console.warn('Video error', e)}
              />
              <Text style={[styles.previewHint, { color: colors.textSecondary }]}>Preview of your selected video</Text>
            </View>
          )}

          {videoUri && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleAnalyze}
              disabled={isAnalyzing}
              style={styles.pickButton}
            >
              <LinearGradient
                colors={['#7C3AED', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pickButtonBg}
              >
                <Sparkles size={18} color="#fff" />
                <Text style={styles.pickButtonText}>{isAnalyzing ? 'Analyzing…' : 'Analyze video'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {analysis && (
            <View style={[styles.analysisCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.analysisTitle, { color: colors.text }]}>Feedback</Text>
              <Text style={[styles.analysisText, { color: colors.text }]}>{analysis}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  hero: {
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.heavy,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  comingSoonCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.medium,
  },
  actionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.medium,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  actionDescription: {
    fontSize: 14,
  },
  pickButton: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  pickButtonBg: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pickButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  previewContainer: {
    marginTop: Spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: 'black',
  },
  previewHint: {
    marginTop: Spacing.xs,
    fontSize: 12,
    textAlign: 'center',
  },
  analysisCard: {
    marginTop: Spacing.md,
    borderRadius: 12,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 20,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  comingSoonDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});


