import type { RuleField } from '@/api/types'

/** 规则可编辑的匹配维度，顺序即界面顺序。标签是后端字段名的人话版，不参与 i18n。 */
export const RULE_FIELDS: ReadonlyArray<readonly [RuleField, string]> = [
  ['domain_suffix', 'Domain Suffix'],
  ['domain_keyword', 'Domain Keyword'],
  ['domain_regex', 'Domain Regex'],
  ['geosite', 'Geosite'],
  ['ip_cidr', 'IP CIDR'],
  ['geoip', 'GeoIP'],
  ['source_ip_cidr', 'Source IP'],
  ['process_name', 'Process Name'],
  ['inbound', 'Inbound'],
  ['protocol', 'Protocol'],
  ['port', 'Port'],
] as const

/** 用户策略里的规则不带 source_ip_cidr —— 来源由"设备分配"注入。 */
export const PROFILE_FIELDS = RULE_FIELDS.filter(([k]) => k !== 'source_ip_cidr')
