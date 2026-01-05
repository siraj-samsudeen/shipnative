import { FC, useState } from "react"
import { View, ScrollView, Switch, useWindowDimensions, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import {
  Text,
  Button,
  Card,
  TextField,
  Avatar,
  Badge,
  Divider,
  Spinner,
  IconButton,
  Container,
  Progress,
  Skeleton,
  SkeletonGroup,
  AnimatedCard,
  Tabs,
  ListItem,
  EmptyState,
} from "@/components"
import { ANIMATION } from "@/config/constants"
import type { MainTabScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme"
import { webDimension } from "@/types/webStyles"

// =============================================================================
// TYPES
// =============================================================================

interface ComponentShowcaseScreenProps extends MainTabScreenProps<"Components"> {}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTENT_MAX_WIDTH = 800

// =============================================================================
// COMPONENT
// =============================================================================

export const ComponentShowcaseScreen: FC<ComponentShowcaseScreenProps> =
  function ComponentShowcaseScreen(_props) {
    const { navigation } = _props
    const { theme } = useUnistyles()
    const { themeContext, setThemeContextOverride } = useAppTheme()
    const insets = useSafeAreaInsets()
    const { width: windowWidth } = useWindowDimensions()

    const [inputValue, setInputValue] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState(65)
    const [activeTab, setActiveTab] = useState("overview")

    const isLargeScreen = windowWidth > 768
    const contentStyle = isLargeScreen
      ? {
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center" as const,
          width: webDimension("100%"),
        }
      : {}

    const toggleTheme = () => {
      setThemeContextOverride(themeContext === "dark" ? "light" : "dark")
    }

    const simulateLoading = () => {
      setIsLoading(true)
      setTimeout(() => setIsLoading(false), 2000)
    }

    const incrementProgress = () => {
      setProgress((prev) => Math.min(prev + 10, 100))
    }

    const ShowcaseContent = () => (
      <View style={styles.contentContainer}>
        {/* Typography Section */}
        <Section title="Typography">
          <Text preset="heading">Heading Text</Text>
          <Text preset="subheading">Subheading Text</Text>
          <Text>Default body text</Text>
          <Text preset="caption">Caption text</Text>
          <Text color="secondary">Secondary color text</Text>
          <Text color="error">Error color text</Text>
          <Text color="success">Success color text</Text>
          <Text color="link">Link color text</Text>
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Buttons Section */}
        <Section title="Buttons">
          <Text size="sm" color="secondary" style={styles.sectionDescription}>
            With haptic feedback and smooth press animations
          </Text>
          <View style={styles.buttonRow}>
            <Button text="Filled" variant="filled" size="md" />
            <Button text="Secondary" variant="secondary" />
            <Button text="Outlined" variant="outlined" />
          </View>
          <View style={styles.buttonRow}>
            <Button text="Ghost" variant="ghost" />
            <Button text="Danger" variant="danger" />
            <Button text="Disabled" disabled />
          </View>
          <View style={styles.buttonRow}>
            <Button text="Small" size="sm" />
            <Button text="Medium" size="md" />
            <Button text="Large" size="lg" />
          </View>
          <View style={styles.buttonRow}>
            <Button text="Loading" loading={isLoading} onPress={simulateLoading} />
            <Button
              text="With Icon"
              LeftAccessory={() => (
                <Ionicons name="star" size={16} color={theme.colors.primaryForeground} />
              )}
            />
          </View>
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Icon Buttons Section */}
        <Section title="Icon Buttons">
          <Text size="sm" color="secondary" style={styles.sectionDescription}>
            Perfect for toolbars and actions
          </Text>
          <View style={styles.iconButtonRow}>
            <IconButton icon="heart" variant="filled" />
            <IconButton icon="settings" variant="outlined" />
            <IconButton icon="share-outline" variant="ghost" />
            <IconButton icon="add" variant="filled" size="sm" />
            <IconButton icon="close" variant="ghost" size="lg" />
          </View>
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Tabs Section */}
        <Section title="Tabs">
          <Text size="sm" color="secondary" style={styles.sectionDescription}>
            Animated indicator with haptic feedback
          </Text>
          <Tabs
            tabs={[
              { key: "overview", title: "Overview" },
              { key: "settings", title: "Settings" },
              { key: "activity", title: "Activity", badge: 3 },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            fullWidth
          />
          <View style={styles.tabContent}>
            <Text color="secondary">
              Active tab: <Text weight="semiBold">{activeTab}</Text>
            </Text>
          </View>

          <Text size="sm" weight="medium" style={styles.variantLabel}>
            Underline variant:
          </Text>
          <Tabs
            variant="underline"
            tabs={[
              { key: "tab1", title: "Tab 1" },
              { key: "tab2", title: "Tab 2" },
              { key: "tab3", title: "Tab 3" },
            ]}
            activeTab={activeTab === "overview" ? "tab1" : "tab2"}
            onTabChange={() => {}}
          />
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Progress Section */}
        <Section title="Progress Indicators">
          <Text size="sm" color="secondary" style={styles.sectionDescription}>
            Animated progress bars with spring physics
          </Text>
          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text size="sm">Default</Text>
              <Text size="sm" weight="semiBold">
                {progress}%
              </Text>
            </View>
            <Progress value={progress} />
          </View>
          <View style={styles.progressItem}>
            <Text size="sm">Success</Text>
            <Progress value={100} variant="success" />
          </View>
          <View style={styles.progressItem}>
            <Text size="sm">Warning</Text>
            <Progress value={60} variant="warning" />
          </View>
          <View style={styles.progressItem}>
            <Text size="sm">Error</Text>
            <Progress value={25} variant="error" />
          </View>
          <View style={styles.progressItem}>
            <Text size="sm">Indeterminate (Loading)</Text>
            <Progress indeterminate />
          </View>
          <Button
            text="Increase Progress"
            size="sm"
            variant="secondary"
            onPress={incrementProgress}
          />
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Skeleton Section */}
        <Section title="Skeleton Loaders">
          <Text size="sm" color="secondary" style={styles.sectionDescription}>
            Shimmer animation for loading states
          </Text>
          <View style={styles.skeletonDemo}>
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonHeader}>
                <Skeleton variant="circular" width={48} height={48} />
                <View style={styles.skeletonHeaderText}>
                  <Skeleton variant="text" width="60%" height={16} />
                  <Skeleton variant="text" width="40%" height={12} />
                </View>
              </View>
              <Skeleton variant="rectangular" width="100%" height={120} />
              <SkeletonGroup gap={8}>
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
              </SkeletonGroup>
            </View>
          </View>
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Animated Cards Section */}
        <Section title="Animated Cards">
          <Text size="sm" color="secondary" style={styles.sectionDescription}>
            Entrance animations with press interactions
          </Text>
          <View style={styles.animatedCardsGrid}>
            <AnimatedCard entering="fadeInUp" delay={0} onPress={() => {}}>
              <Text weight="semiBold">Fade In Up</Text>
              <Text size="sm" color="secondary">
                Tap for feedback
              </Text>
            </AnimatedCard>
            <AnimatedCard entering="zoomIn" delay={ANIMATION.STAGGER_DELAY} onPress={() => {}}>
              <Text weight="semiBold">Zoom In</Text>
              <Text size="sm" color="secondary">
                Tap for feedback
              </Text>
            </AnimatedCard>
            <AnimatedCard
              entering="slideInLeft"
              delay={ANIMATION.STAGGER_DELAY * 2}
              tiltEffect
              onPress={() => {}}
            >
              <Text weight="semiBold">Slide In + Tilt</Text>
              <Text size="sm" color="secondary">
                Drag for 3D tilt
              </Text>
            </AnimatedCard>
          </View>
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Text Fields Section */}
        <Section title="Text Fields">
          <TextField
            label="Default Input"
            placeholder="Enter text..."
            value={inputValue}
            onChangeText={setInputValue}
          />
          <TextField
            label="With Helper"
            placeholder="Enter email..."
            helper="We'll never share your email"
          />
          <TextField
            label="Error State"
            placeholder="Enter password..."
            status="error"
            helper="Password is required"
          />
          <TextField
            label="Success State"
            placeholder="Verified"
            status="success"
            value="user@example.com"
          />
          <TextField
            label="Disabled"
            placeholder="Cannot edit"
            status="disabled"
            value="Disabled input"
          />
          <TextField
            label="Multiline"
            placeholder="Enter description..."
            multiline
            numberOfLines={4}
          />
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Cards Section */}
        <Section title="Cards">
          <Card
            heading="Default Card"
            content="This is the default card style with a border"
            footer="Footer text"
          />
          <Card
            preset="elevated"
            heading="Elevated Card"
            content="This card has a shadow for elevation"
            footer="With shadow"
          />
          <Card
            preset="outlined"
            heading="Outlined Card"
            content="This card only has an outline border"
          />
          <Card
            heading="Pressable Card"
            content="Tap me to see interaction"
            onPress={() => console.log("Card pressed")}
            RightComponent={
              <View style={styles.cardIcon}>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.foreground} />
              </View>
            }
          />
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* List Items Section */}
        <Section title="List Items">
          <View style={styles.listContainer}>
            <ListItem text="Default List Item" bottomSeparator />
            <ListItem
              text="With Left Icon"
              LeftComponent={
                <View style={styles.listIconBox}>
                  <Ionicons name="phone-portrait-outline" size={18} color={theme.colors.foreground} />
                </View>
              }
              bottomSeparator
            />
            <ListItem
              text="With Right Chevron"
              RightComponent={
                <Ionicons name="chevron-forward" size={20} color={theme.colors.foregroundSecondary} />
              }
              bottomSeparator
            />
            <ListItem text="Tappable Item" onPress={() => console.log("Item pressed")} />
          </View>
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Empty State Section */}
        <Section title="Empty State">
          <EmptyState
            preset="generic"
            heading="No Items Found"
            content="You haven't added any items yet. Start by creating your first one."
            button="Create Item"
            buttonOnPress={() => console.log("Create pressed")}
          />
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Avatars Section */}
        <Section title="Avatars">
          <View style={styles.avatarRow}>
            <Avatar fallback="XS" size="xs" />
            <Avatar fallback="SM" size="sm" />
            <Avatar fallback="MD" size="md" />
            <Avatar fallback="LG" size="lg" />
            <Avatar fallback="XL" size="xl" />
          </View>
          <View style={styles.avatarRow}>
            <Avatar fallback="JD" shape="circle" />
            <Avatar fallback="AB" shape="rounded" />
            <Avatar fallback="CD" shape="square" />
          </View>
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Badges Section */}
        <Section title="Badges">
          <View style={styles.badgeRow}>
            <Badge text="Default" />
            <Badge text="Primary" variant="primary" />
            <Badge text="Secondary" variant="secondary" />
          </View>
          <View style={styles.badgeRow}>
            <Badge text="Success" variant="success" />
            <Badge text="Error" variant="error" />
            <Badge text="Warning" variant="warning" />
            <Badge text="Info" variant="info" />
          </View>
          <View style={styles.badgeRow}>
            <Badge text="Small" size="sm" />
            <Badge text="Medium" size="md" />
            <Badge text="Large" size="lg" />
          </View>
          <View style={styles.badgeRow}>
            <Badge dot variant="default" />
            <Badge dot variant="error" />
            <Badge dot variant="success" />
            <Badge dot variant="warning" size="lg" />
          </View>
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Dividers Section */}
        <Section title="Dividers">
          <Text size="sm" color="secondary" style={styles.dividerLabel}>
            Horizontal (thin)
          </Text>
          <Divider size="thin" />
          <Text size="sm" color="secondary" style={styles.dividerLabel}>
            Horizontal (default)
          </Text>
          <Divider />
          <Text size="sm" color="secondary" style={styles.dividerLabel}>
            Horizontal (thick)
          </Text>
          <Divider size="thick" />
          <Text size="sm" color="secondary" style={styles.dividerLabel}>
            With label
          </Text>
          <Divider label="OR" />
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Spinners Section */}
        <Section title="Spinners">
          <View style={styles.spinnerRow}>
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </View>
          <Spinner text="Loading data..." />
        </Section>

        <Divider style={styles.sectionDivider} />

        {/* Color Palette Section */}
        <Section title="Color Palette">
          <View style={styles.colorGrid}>
            <ColorSwatch color={theme.colors.primary} name="Primary" />
            <ColorSwatch color={theme.colors.secondary} name="Secondary" />
            <ColorSwatch color={theme.colors.accent} name="Accent" />
            <ColorSwatch color={theme.colors.success} name="Success" />
            <ColorSwatch color={theme.colors.error} name="Error" />
            <ColorSwatch color={theme.colors.warning} name="Warning" />
            <ColorSwatch color={theme.colors.info} name="Info" />
            <ColorSwatch color={theme.colors.background} name="Background" border />
            <ColorSwatch color={theme.colors.card} name="Card" border />
            <ColorSwatch color={theme.colors.foreground} name="Foreground" />
          </View>
        </Section>

        <View style={styles.footer}>
          <Text size="sm" color="tertiary" style={styles.footerText}>
            All components are styled with Unistyles 3.0
          </Text>
          <Text size="sm" color="tertiary" style={styles.footerText}>
            With haptics and microanimations
          </Text>
          <Text size="sm" color="tertiary" style={styles.footerText}>
            Theme: {themeContext}
          </Text>
        </View>
      </View>
    )

    return (
      <Container safeAreaEdges={["top"]}>
        <View style={[styles.header, { paddingHorizontal: theme.spacing.lg }]}>
          <View style={styles.headerLeft}>
            <IconButton icon="arrow-back" variant="ghost" onPress={() => navigation.goBack()} />
            <Text size="2xl" weight="bold">
              Components
            </Text>
          </View>
          <View style={styles.themeToggle}>
            <Ionicons
              name={themeContext === "dark" ? "moon" : "sunny"}
              size={18}
              color={theme.colors.foregroundSecondary}
            />
            <Switch
              value={themeContext === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.tint }}
            />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            contentStyle,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ShowcaseContent />
        </ScrollView>
      </Container>
    )
  }

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text size="lg" weight="bold" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  )
}

interface ColorSwatchProps {
  color: string
  name: string
  border?: boolean
}

function ColorSwatch({ color, name, border }: ColorSwatchProps) {
  const { theme } = useUnistyles()
  return (
    <View style={styles.colorSwatch}>
      <View
        style={[
          styles.colorBox,
          { backgroundColor: color },
          border && [styles.colorBoxWithBorder, { borderColor: theme.colors.border }],
        ]}
      />
      <Text size="xs" color="secondary">
        {name}
      </Text>
    </View>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create((theme) => ({
  scrollView: {
    flex: 1,
    // Enable mouse wheel scrolling on web
    ...(Platform.OS === "web" && {
      overflowY: "auto" as unknown as "scroll",
    }),
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  contentContainer: {
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  themeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    color: theme.colors.foreground,
  },
  sectionDescription: {
    marginBottom: theme.spacing.md,
    marginTop: -theme.spacing.xs,
  },
  sectionContent: {
    gap: theme.spacing.md,
  },
  sectionDivider: {
    marginVertical: theme.spacing.lg,
  },
  variantLabel: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  iconButtonRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    alignItems: "center",
  },
  tabContent: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    alignItems: "center",
  },
  progressItem: {
    gap: theme.spacing.xs,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonDemo: {
    gap: theme.spacing.md,
  },
  skeletonCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadows.sm,
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  skeletonHeaderText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  animatedCardsGrid: {
    gap: theme.spacing.md,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  dividerLabel: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xl,
  },
  cardIcon: {
    alignSelf: "center",
    padding: theme.spacing.sm,
  },
  listContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    ...theme.shadows.sm,
  },
  listIconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  colorSwatch: {
    alignItems: "center",
    gap: theme.spacing.xxs,
  },
  colorBox: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
  },
  colorBoxWithBorder: {
    borderWidth: 1,
  },
  footer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.xxs,
  },
  footerText: {
    textAlign: "center",
  },
}))
