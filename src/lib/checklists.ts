// 생활폐기물 수집·운반 작업 전 체크리스트 정의
// (제작·배포: 한국산업안전보건공단, 편집: 한국폐기물협회)
//
// 점검항목 텍스트는 규정 문구이므로 코드 상수로 관리한다.
// 향후 다른 작업 유형(수집·운반 공통 등)을 추가할 때 이 파일만 확장하면 된다.

export type ChecklistAnswer = 'O' | 'V' | '-'; // 적정(○), 개선필요(✔), 해당없음(-)

export interface ChecklistItem {
    no: number;
    text: string;
}

export interface ChecklistDef {
    type: string;
    title: string;
    items: ChecklistItem[];
}

// 답변 표기 (문서 기준: 적정(○), 개선필요(✔), 해당없음(-))
export const ANSWER_LABELS: Record<ChecklistAnswer, string> = {
    O: '적정',
    V: '개선필요',
    '-': '해당없음',
};

export const ANSWER_SYMBOLS: Record<ChecklistAnswer, string> = {
    O: '○',
    V: '✔',
    '-': '-',
};

export const ANSWER_ORDER: ChecklistAnswer[] = ['O', 'V', '-'];

// 1번. 가로 청소
export const STREET_CLEANING_CHECKLIST: ChecklistDef = {
    type: 'street_cleaning',
    title: '가로 청소 작업 전 안전점검',
    items: [
        { no: 1, text: '청소 및 이동 시 노면의 상태나 이물질이 있는지 확인하는가?' },
        { no: 2, text: '미끄럼방지 기능이 있는 신발을 착용하였는가?' },
        { no: 3, text: '인도→도로, 도로→인도 이동 시 경계석에 주의하여 이동하는가?' },
        { no: 4, text: '도로 횡단 시 횡단보도로 건너는 등 교통안전수칙을 준수하는가?' },
        { no: 5, text: '도로변 청소 시 주행 중인 차량에 주의하는가?' },
        { no: 6, text: '작업 전·후 또는 작업 중 수시로 스트레칭을 실시하는가?' },
        { no: 7, text: '쓰레기 봉투 내 유리조각 등 날카로운 것이 있는지 확인하는가?' },
        { no: 8, text: '작업 시 피부노출을 최소화하고 개인위생을 잘 관리하는가?' },
        { no: 9, text: '계단 이동 시 핸드레일을 잡고 이동하는 등 넘어지지 않도록 주의하는가?' },
        { no: 10, text: '차량 이용 도로청소 시 차량과 인접한 근로자를 확인하고 주의하는가?' },
    ],
};

export const CHECKLISTS: Record<string, ChecklistDef> = {
    street_cleaning: STREET_CLEANING_CHECKLIST,
};

// 현재 근로자에게 노출할 기본 체크리스트 유형
export const DEFAULT_CHECKLIST_TYPE = 'street_cleaning';

export function getChecklistDef(type: string): ChecklistDef | undefined {
    return CHECKLISTS[type];
}

export interface ChecklistResultItem {
    no: number;
    answer: ChecklistAnswer;
}
