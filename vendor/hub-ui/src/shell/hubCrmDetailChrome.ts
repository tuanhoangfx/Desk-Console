/** Shared CRM Customer Detail chrome — P0005 + P0015 (pattern-reuse, 2 tools). */

export const CRM_DETAIL_CONTROL_CLASS = "field auth-gate-field crm-adm-control";

/** P0020 golden aligned form rows — fixed label width via hub-account-detail-modal.css */
export const CRM_DETAIL_FORM_STACK_CLASS = "crm-detail-form-rows";
export const CRM_DETAIL_FORM_ROW_ALIGNED_3 = "hub-adm-form-row hub-adm-form-row--aligned";
export const CRM_DETAIL_FORM_ROW_ALIGNED_2 = "hub-adm-form-row hub-adm-form-row--aligned-2";
/** Full-width detail row — single label|value track. */
export const CRM_DETAIL_FORM_ROW_DETAIL_LINE =
  "hub-adm-form-row hub-adm-form-row--aligned hub-adm-form-row--single hub-adm-form-row--detail-line";

export type HubCrmDetailTocItem = {
  id: string;
  label: string;
  emoji: string;
};
