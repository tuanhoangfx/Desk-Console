export type DesignFeatureId = never;

export type ActiveDesignFeature = {
  id: DesignFeatureId;
  title: string;
  subtitle: string;
  project: string;
};

const FEATURES: ActiveDesignFeature[] = [];

export function listActiveDesignFeatures(): ActiveDesignFeature[] {
  return FEATURES;
}

export function getActiveDesignFeature(_id: string | null | undefined): ActiveDesignFeature | null {
  return null;
}

export const ACTIVE_DESIGN_COUNT = FEATURES.length;
