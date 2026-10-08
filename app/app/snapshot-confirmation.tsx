'use client';
import {ImagePlus} from 'lucide-react';
/** Preview-only confirmation. No request, draft write, provider call, or credit action. */
export default function SnapshotConfirmation({onClose}:{onClose:()=>void}){
 return <div className="snapshot-confirmation"><span className="snapshot-confirmation-icon"><ImagePlus size={26}/></span><h2>이 장면을 이미지로 생성하시겠습니까?</h2><p>이미지 생성 기능은 아직 준비 중이에요.</p><div className="snapshot-confirmation-actions"><button type="button" className="secondary" onClick={onClose}>취소</button><button type="button" className="primary" disabled aria-label="스냅샷 생성 · 준비 중">생성</button></div></div>;
}
