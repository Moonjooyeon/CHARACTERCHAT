// Product pricing proposal; not a provider quote. No live inference billing yet.
export const modelCatalog=[
 {id:'sample',name:'샘플 대화',credits:0,group:'체험',description:'준비된 답변으로 화면을 체험해요.'},
 {id:'gemini-flash',name:'Gemini 3 Flash',credits:4,group:'일상',description:'가벼운 대화를 위한 기본 가격대'},
 {id:'gemini-pro',name:'Gemini 3.1 Pro',credits:8,group:'균형',description:'사건과 대화를 함께 이어가는 가격대'},
 {id:'claude-sonnet',name:'Claude Sonnet 4.6',credits:10,group:'서사',description:'관계와 장면 묘사를 위한 가격대'},
 {id:'gpt',name:'GPT-5.4',credits:12,group:'심화',description:'복잡한 설정과 진행을 위한 가격대'},
 {id:'claude-opus',name:'Claude Opus 4.7',credits:25,group:'프리미엄',description:'중요한 서사 장면을 위한 최고 가격대'},
] as const;
export function modelByChoice(choice:string){return modelCatalog.find(m=>m.id===choice||m.name===choice)||modelCatalog.find(m=>m.id===({'Claude Opus':'claude-opus','Gemini':'gemini-pro'} as Record<string,string>)[choice])}
