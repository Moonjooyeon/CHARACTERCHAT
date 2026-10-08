import {normalizeStatusTemplate,defaultStatusTemplate} from './status-fields';
export const templatePresets=[
 {id:'builtin-full',name:'온서 · 장면 기록',description:'열세 가지 항목으로 장면의 맥락을 기록해요.',fields:defaultStatusTemplate()},
 {id:'builtin-relationship',name:'사이의 온도',description:'관계와 감정에 집중하는 간결한 상태창.',fields:normalizeStatusTemplate(['relationship','emotion','mood','inner_thought','place','time'].map(key=>({key,enabled:true})))},
 {id:'builtin-journey',name:'여행자의 수첩',description:'날짜, 장소와 다음 일정을 함께 기록해요.',fields:normalizeStatusTemplate(['date','weekday','time','place','schedule','pc_clothes'].map(key=>({key,enabled:true})))}
];
