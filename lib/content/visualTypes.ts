// lib/content/visualTypes.ts
//
// DriverNord Content & Distribution Engine V1 — Phase 2 Visual Type Definitions
//
// All types for the Visual Production Pipeline. Pure types — no DB imports.
//
// BOUNDARIES:
//   ✗ Does NOT connect to Facebook, Meta, or any image API
//   ✗ Does NOT publish anything externally
//   ✓ Internal visual planning and preview generation only

// ─── Visual family ────────────────────────────────────────────────────────────

export type VisualFamily =
  | 'reality_of_work'           // A: Terminal, loading bay, cab, highway, warehouse, night shift
  | 'driver_pride'              // B: Human-centered — professional portrait, natural posture
  | 'operational_intelligence'  // C: Infographic education — CE/C/D, YKB, license categories
  | 'community_conversation'    // D: Question-led graphic, warmer tone, discussion prompt
  | 'drivernord_campaign';      // E: Premium brand-forward — rare, future acquisition use

// ─── Asset strategy ───────────────────────────────────────────────────────────

export type AssetStrategy =
  | 'real_asset'               // Authentic photo from real transport environment needed
  | 'branded_graphic'          // Text-led or infographic — can be produced now as branded SVG
  | 'future_ai_generated'      // Photorealistic scene needed — queued for AI image pipeline
  | 'no_visual_needed';        // Text-only post; visual would reduce effectiveness

// ─── Visual gate outcome ──────────────────────────────────────────────────────

export type VisualGateOutcome =
  | 'ready_for_internal_preview'    // Passes all checks; operator can review
  | 'held_for_risk'                 // Content risk applies to visual too
  | 'blocked_for_repetition'        // Family, scene, or concept repeats within cooldown
  | 'needs_better_brief'            // Insufficient driver_insight to determine direction
  | 'requires_real_asset'           // Strategy is real_asset; no asset exists yet
  | 'requires_future_ai_generation' // Queued for when AI image pipeline opens
  | 'no_visual_needed';             // Text-only post; no visual planned

// ─── Lifecycle ────────────────────────────────────────────────────────────────

export type VisualLifecycleStatus =
  | 'draft'    // generated, not yet reviewed
  | 'ready'    // operator approved
  | 'held'     // blocked for review
  | 'archived'; // superseded or cancelled

// ─── Composition ─────────────────────────────────────────────────────────────

export type TextOverlayStructure =
  | 'single_headline'        // One line, ≤ 6 words
  | 'headline_plus_support'  // Headline + support line, total ≤ 16 words
  | 'text_only_minimal'      // Pure text graphic, max 3 short lines
  | 'no_text';               // No text on image

export type CompositionDirection =
  | 'driver_subject_foreground' // Driver as hero; vehicle/setting as context
  | 'vehicle_dominant'          // Vehicle is primary visual element
  | 'landscape_wide'            // Wide establishing shot — road, terminal, city
  | 'close_up_detail'           // Detail: hands on wheel, paperwork, equipment
  | 'text_centered_minimal'     // Branded text graphic; minimal photography
  | 'split_horizontal'          // Two-panel layout (e.g. myth vs reality)
  | 'documentary_candid';       // Unposed, candid transport moment

// ─── Scene and context ────────────────────────────────────────────────────────

export type SceneType =
  | 'terminal_operations'   // Goods movement at a logistics terminal
  | 'loading_bay'           // Truck docked, goods being loaded
  | 'cab_interior'          // Inside cab — steering wheel, dashboard, driver view
  | 'highway_route'         // Truck on Swedish highway, daylight or dusk
  | 'city_delivery'         // Urban distribution — last mile, city streets
  | 'warehouse'             // Indoor warehouse operations
  | 'early_morning_start'   // 04:00–06:00 departure, darkness, logistics preparation
  | 'night_shift'           // Night transport or terminal under artificial light
  | 'weather_conditions'    // Rain, snow, fog — Swedish transport realism
  | 'driver_portrait'       // Professional portrait in work context
  | 'vehicle_close_up'      // Close detail of a CE, C, or D vehicle
  | 'infographic_education' // Simple visual explanation of concept (YKB, license categories)
  | 'branded_text_only'     // Branded text-only graphic, no photography
  | 'community_prompt';     // Discussion-prompt visual — warmer, question-led

export type SubjectType =
  | 'ce_driver'        // CE heavy transport driver
  | 'c_driver'         // C medium/regional driver
  | 'd_driver'         // D bus driver
  | 'logistics_worker' // Warehouse, terminal, distribution worker
  | 'vehicle_heavy'    // CE truck / semi-trailer
  | 'vehicle_medium'   // C-category truck
  | 'vehicle_bus'      // D-category bus
  | 'equipment_detail' // Loading equipment, forks, pallets
  | 'no_subject';      // Pure text/infographic; no person or vehicle

export type VisualSetting =
  | 'urban_sweden'         // Swedish city street
  | 'highway_sweden'       // Swedish highway / motorway
  | 'terminal'             // Logistics terminal / freight yard
  | 'warehouse'            // Indoor warehouse
  | 'delivery_environment' // Customer delivery point
  | 'branded_background'   // Solid brand color or gradient
  | 'abstract_minimal';    // Minimal / geometric background

export type TransportContext =
  | 'ce_heavy_transport'     // CE long-haul / regional heavy transport
  | 'c_medium_transport'     // C medium truck / regional distribution
  | 'd_bus_transport'        // D bus passenger transport
  | 'distribution_logistics' // Last-mile / multi-stop distribution
  | 'warehouse_logistics'    // Warehouse / terminal operations
  | 'general_transport'      // Mixed / unspecified transport
  | 'none';                  // Not applicable (text-only content)

// ─── Mood and atmosphere ──────────────────────────────────────────────────────

export type VisualMood =
  | 'professional_confidence' // Calm, capable, in-control
  | 'warm_collegial'          // Human, collegial, inclusive
  | 'informative_clear'       // Clean, educational, trustworthy
  | 'motivational_calm'       // Energizing without being pushy
  | 'community_welcoming'     // Inviting, discussion-friendly
  | 'early_morning_focused';  // Focused, dedicated, pre-dawn energy

export type TimeOfDay =
  | 'early_morning'  // 04:00–07:00
  | 'day'            // 07:00–17:00
  | 'late_afternoon' // 17:00–20:00
  | 'evening'        // 20:00–22:00
  | 'night'          // 22:00–04:00
  | 'not_applicable'; // Infographic / text-only

export type LightCondition =
  | 'golden_hour'    // Sunrise or sunset warm tones
  | 'overcast'       // Flat grey Swedish light
  | 'rain'           // Wet roads, grey atmosphere
  | 'snow'           // Swedish winter
  | 'clear_day'      // Bright daylight
  | 'artificial'     // Terminal / warehouse artificial lighting
  | 'not_applicable'; // Text/infographic

// ─── Format ───────────────────────────────────────────────────────────────────

export type VisualFormatRecommendation =
  | 'portrait_1080x1350'  // Primary — 4:5, mobile feed optimal
  | 'square_1080x1080'    // Secondary — 1:1, universal
  | 'story_1080x1920';    // Story/Reel — 9:16

// ─── Creative mode ────────────────────────────────────────────────────────────
// Re-exported from creativeMechanism.ts for use in visual plan types.

export type CreativeMode = 'trust_organic' | 'performance_acquisition';

// ─── Visual feedback signals ──────────────────────────────────────────────────

export type VisualFeedbackSignal =
  // ─ Core visual quality signals ─────────────────────────────────────────────
  | 'excellent_visual_pattern'        // This visual direction worked — reproduce it
  | 'too_ai_looking'                  // Looks synthetic / AI-generated
  | 'too_generic'                     // Generic stock-photo feel, not transport-specific
  | 'weak_composition'                // Poor framing or visual balance
  | 'weak_swedish_transport_realism'  // Doesn't feel like Swedish logistics
  | 'too_much_on_image_text'          // Text overload on visual
  | 'poor_mobile_readability'         // Hard to read on mobile screen
  | 'brand_inconsistency'             // Colors or typography off-brand
  | 'avoid_this_visual_family'        // Pause this visual family for now
  | 'avoid_this_scene_type'           // Avoid this specific scene
  | 'reuse_this_visual_direction'     // Strong direction worth repeating
  | 'future_campaign_candidate'       // Elevate to campaign-quality when resources allow
  // ─ Reference learning signals (proven mechanism feedback) ──────────────────
  | 'mechanism_selection_correct'     // Correct mechanism chosen for this content
  | 'mechanism_selection_wrong'       // Wrong mechanism — doesn't fit content
  | 'mode_trust_organic_preferred'    // Founder prefers trust_organic mode here
  | 'mode_performance_preferred'      // Founder prefers performance_acquisition mode here
  | 'channel_fit_accurate'            // Channel recommendation was accurate
  | 'mechanism_add_to_rotation'       // This mechanism should be used more regularly
  | 'mechanism_remove_from_rotation'; // This mechanism should be suppressed for this angle

// ─── Core domain objects ──────────────────────────────────────────────────────

export interface VisualProductionPlan {
  id: string;
  campaign_card_id: string;

  // Visual specification
  visual_objective: string;
  asset_strategy: AssetStrategy;
  asset_strategy_reason: string;
  visual_family: VisualFamily;
  scene_type: SceneType;
  subject_type: SubjectType;
  setting: VisualSetting;
  transport_context: TransportContext;
  mood: VisualMood;
  time_of_day: TimeOfDay;
  light_condition: LightCondition;
  composition_direction: CompositionDirection;

  // Copy on image
  text_overlay_structure: TextOverlayStructure;
  proposed_headline?: string;       // ≤ 6 words on-image
  proposed_support_line?: string;   // ≤ 10 words; optional
  max_word_count_on_image: number;  // derived from format + composition rules

  // Format
  format_recommendation: VisualFormatRecommendation;

  // Brand
  required_brand_elements: string[];
  prohibited_elements: string[];

  // Quality and lifecycle
  provenance_status: 'unverified' | 'approved_real_asset' | 'branded_graphic_ready' | 'placeholder';
  visual_risk_level: 'low' | 'medium' | 'high';
  gate_outcome: VisualGateOutcome;
  gate_findings: string[];
  similarity_warning?: string;
  lifecycle_status: VisualLifecycleStatus;

  // Feedback
  feedback_signals?: VisualFeedbackSignal[];

  // Proven creative reference mechanism (from Reference Library V1)
  reference_mechanism_id?:      string;
  creative_mode?:               CreativeMode;
  mechanism_selection_reason?:  string;
  channel_fit_recommendation?:  string;
  mechanism_cooldown_warnings?: string[];

  // Future asset reference
  asset_reference_placeholder?: string;

  // Audit
  generated_by: string;
  created_at: string;  // ISO datetime
  updated_at: string;
}

// ─── Visual memory (for anti-repetition) ─────────────────────────────────────

export interface VisualMemoryEntry {
  visual_family:          VisualFamily;
  scene_type:             SceneType;
  subject_type:           SubjectType;
  setting:                VisualSetting;
  composition_direction:  CompositionDirection;
  text_overlay_structure: TextOverlayStructure;
  transport_context:      TransportContext;
  concept_signature:      string;       // for concept similarity check
  gate_outcome:           VisualGateOutcome;
  planned_date:           string;       // ISO date (YYYY-MM-DD)
  asset_strategy:         AssetStrategy;
  // Reference library V1 fields (optional — populated when mechanism selector runs)
  reference_mechanism_id?: string;
  creative_mode?:          CreativeMode;
  visual_language_tags?:   string[];   // from ProvenCreativeReference.visual_language
  format_tag?:             string;     // from ProvenCreativeReference.mobile_first_pattern
}

// ─── Anti-repetition ─────────────────────────────────────────────────────────

export interface VisualAntiRepetitionViolation {
  rule: string;
  message: string;
  severity: 'block' | 'warn';
}

export interface VisualAntiRepetitionResult {
  blocked: boolean;
  violations: VisualAntiRepetitionViolation[];
  blocked_reason?: string;
}

// ─── Quality gate ─────────────────────────────────────────────────────────────

export interface VisualGateResult {
  outcome: VisualGateOutcome;
  findings: string[];
  blocked_reasons: string[];
  warnings: string[];
}

// ─── Preview specification ────────────────────────────────────────────────────

export interface VisualPreviewSpec {
  campaign_card_id: string;
  visual_plan_id: string;
  is_internal_only: true;    // always true in Phase 2
  preview_type: 'branded_graphic_svg' | 'concept_description';
  svg_content?: string;      // only for branded_graphic_svg
  concept_description: string;
  composition_notes: string;
  copy_hierarchy: string;
  format_notes: string;
  disclaimer: string;
}
