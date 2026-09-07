"use client";

import { PagedArticle, type PageBlock } from "@/components/paged-article";
import { BrandMark } from "@/components/brand-mark";
import { COMPANY } from "@/lib/company";
import type { ContractContext } from "@/lib/contract";
import { formatThaiDate } from "@/lib/thai";
import { cn } from "cn";
import type { ReactNode } from "react";

function Fill({
  value,
  fallback = "................................",
  className,
}: {
  value?: string | number;
  fallback?: string;
  className?: string;
}) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  if (text) {
    return <span className={cn("font-semibold", className)}>{text}</span>;
  }
  return (
    <span
      className={cn(
        "inline-block min-w-[7rem] border-b border-dotted border-neutral-400 text-transparent",
        className
      )}
    >
      {fallback}
    </span>
  );
}

function SignLine({
  role,
  name,
  company,
  position,
}: {
  role: string;
  name?: string;
  company?: string;
  position?: string;
}) {
  return (
    <div className="sign-line">
      <p className="sign-ink">
        <span className="sign-ink-label">ลงชื่อ</span>
        <span className="sign-rule" aria-hidden />
        <span className="sign-ink-role">{role}</span>
      </p>
      <p className="sign-name">
        (
        {name?.trim() ? (
          <span className="font-semibold"> {name} </span>
        ) : (
          <span className="sign-dots"> ................................ </span>
        )}
        )
      </p>
      <p className="sign-company">{company?.trim() ? company : "\u00a0"}</p>
      <p className="sign-position">
        ตำแหน่ง{" "}
        {position?.trim() ? (
          <span className="font-semibold">{position}</span>
        ) : (
          <span className="sign-dots">........................</span>
        )}
      </p>
    </div>
  );
}

function SignatureBlock({ ctx }: { ctx: ContractContext }) {
  return (
    <div className="contract-sign-block">
      <div className="sign-pair">
        <SignLine
          role="ผู้ว่าจ้าง"
          name={ctx.client_authorized}
          position={ctx.client_position}
        />
        <SignLine
          role="ผู้รับจ้าง"
          name={ctx.contractor_authorized}
          company={COMPANY.name}
          position={ctx.contractor_position || "ผู้มีอำนาจลงนาม"}
        />
      </div>
      <div className="sign-pair">
        <SignLine role="พยานฝ่ายผู้ว่าจ้าง" name={ctx.witness_client} />
        <SignLine role="พยานฝ่ายผู้รับจ้าง" name={ctx.witness_contractor} />
      </div>
    </div>
  );
}

function ContractHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="contract-header">
      <BrandMark variant="contract" />
      <div className="contract-header-meta">{right}</div>
    </header>
  );
}

function DocumentTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="contract-doc-title">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

function Clause({ n, children }: { n: number; children: ReactNode }) {
  return (
    <p className="contract-clause">
      <span className="font-semibold">ข้อ {n}. </span>
      {children}
    </p>
  );
}

function itemBlocks(
  prefix: string,
  heading: string,
  items: string[],
  fallback: string,
  columns: 1 | 2 = 1
): PageBlock[] {
  const nodes: PageBlock[] = [
    {
      key: `${prefix}-h`,
      keepWithNext: true,
      node: <p className="mt-3 font-semibold">{heading}</p>,
    },
  ];
  if (items.length === 0) {
    nodes.push({
      key: `${prefix}-empty`,
      node: <p className="leading-6 text-neutral-500">{fallback}</p>,
    });
    return nodes;
  }
  if (columns === 2) {
    for (let index = 0; index < items.length; index += 2) {
      const row = items.slice(index, index + 2);
      nodes.push({
        key: `${prefix}-${index}`,
        node: (
          <ul className="checklist-two-col">
            {row.map((item, offset) => (
              <li key={`${prefix}-${index}-${offset}`}>
                <span className="font-semibold">{item}</span>
              </li>
            ))}
          </ul>
        ),
      });
    }
    return nodes;
  }
  items.forEach((item, index) => {
    nodes.push({
      key: `${prefix}-${index}`,
      node: (
        <p className="checklist-item">
          <span className="font-semibold">{item}</span>
        </p>
      ),
    });
  });
  return nodes;
}

function MultilineFill({
  value,
  fallback,
}: {
  value: string;
  fallback: string;
}) {
  if (value.trim()) {
    return (
      <p className="whitespace-pre-wrap leading-6">
        <span className="font-semibold">{value}</span>
      </p>
    );
  }
  return <p className="leading-6 text-neutral-500">{fallback}</p>;
}

function splitLines(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function contractMeta(ctx: ContractContext, date: string) {
  return (
    <>
      <p>
        สัญญาเลขที่ <Fill value={ctx.contract_no} />
      </p>
      <p>
        วันที่ <Fill value={date} />
      </p>
    </>
  );
}

export function ContractDocument({ ctx }: { ctx: ContractContext }) {
  const contractDate = formatThaiDate(ctx.contract_date);
  const startDate = formatThaiDate(ctx.start_date);
  const endDate = formatThaiDate(ctx.end_date);
  const monthsLabel = ctx.contract_months ? String(ctx.contract_months) : "";
  const roles =
    ctx.staff_roles.length > 0
      ? ctx.staff_roles
      : [
          {
            id: "fallback",
            title: "พนักงานรักษาความสะอาด",
            count: 0,
            price_per_head: 0,
            price_per_head_text: "0.00",
            monthly: 0,
            monthly_text: "0.00",
          },
        ];

  const letterhead = (
    <ContractHeader right={contractMeta(ctx, contractDate)} />
  );

  const mainBlocks: PageBlock[] = [
    {
      key: "title",
      keepWithNext: true,
      node: <DocumentTitle title="สัญญาบริการทำความสะอาด" />,
    },
    {
      key: "place",
      node: (
        <p className="mt-3 text-[13px] leading-snug">
          ทำที่ {COMPANY.madeAt}
          <br />
          <span className="text-[12.5px] text-neutral-700">
            {COMPANY.address}
          </span>
        </p>
      ),
    },
    {
      key: "between",
      node: <p className="contract-indent mt-4">สัญญาฉบับนี้ทำขึ้นระหว่าง</p>,
    },
    {
      key: "client",
      node: (
        <p className="contract-indent">
          <Fill value={ctx.client_name} /> ตั้งอยู่ที่{" "}
          <Fill value={ctx.client_address} /> โดย{" "}
          <Fill value={ctx.client_authorized} />{" "}
          <Fill value={ctx.client_position} fallback="................" />{" "}
          ผู้มีอำนาจกระทำแทน ซึ่งต่อไปในสัญญานี้เรียกว่า “ผู้ว่าจ้าง” ฝ่ายหนึ่ง
          กับ
        </p>
      ),
    },
    {
      key: "contractor",
      node: (
        <p className="contract-indent">
          {COMPANY.name} (เลขทะเบียนนิติบุคคล : {COMPANY.registrationNo})
          สำนักงานตั้งอยู่ {COMPANY.address} โดย{" "}
          <Fill
            value={ctx.contractor_authorized}
            fallback="................................"
          />{" "}
          <Fill
            value={ctx.contractor_position}
            fallback="ผู้มีอำนาจลงนาม"
          />{" "}
          ผู้มีอำนาจกระทำแทน ซึ่งต่อไปในสัญญานี้จะเรียกว่า “ผู้รับจ้าง”
          อีกฝ่ายหนึ่ง
        </p>
      ),
    },
    {
      key: "intent",
      node: (
        <p className="contract-indent mt-3">
          โดยที่ผู้ว่าจ้างมีความประสงค์จะว่าจ้างให้ผู้รับจ้างดูแลทำความสะอาด{" "}
          <Fill value={ctx.client_name} /> ซึ่งต่อไปในสัญญานี้จะเรียกว่า
          “พื้นที่” และผู้รับจ้างตกลงรับจ้างเหมาทำความสะอาดตามความประสงค์ของ
          ผู้ว่าจ้าง
        </p>
      ),
    },
    {
      key: "agree",
      node: (
        <p className="contract-indent">
          คู่สัญญาทั้งสองฝ่ายจึงร่วมกันตกลงดังมีข้อความต่อไปนี้คือ
        </p>
      ),
    },
    {
      key: "c1",
      node: (
        <Clause n={1}>
          คู่สัญญาทั้งสองฝ่ายตกลงกำหนดขอบเขตของ “พื้นที่”
          และรายละเอียดของงาน ขั้นตอน วิธีการทำความสะอาด
          รวมถึงรายการอุปกรณ์และน้ำยาทำความสะอาด
          ปรากฏตามเอกสารแนบท้ายสัญญา 2
        </Clause>
      ),
    },
    {
      key: "c2",
      node: (
        <Clause n={2}>
          คู่สัญญาทั้งสองฝ่ายตกลงให้สัญญาฉบับนี้มีผลใช้บังคับ นับตั้งแต่วันที่{" "}
          <Fill value={startDate} /> ถึงวันที่ <Fill value={endDate} />{" "}
          (ระยะเวลา <Fill value={monthsLabel} fallback="......" /> เดือน)
          ทั้งนี้หากคู่สัญญาฝ่ายหนึ่งฝ่ายใดประสงค์จะบอกเลิกสัญญา
          ให้แจ้งเป็นลายลักษณ์อักษรให้อีกฝ่ายทราบล่วงหน้าไม่น้อยกว่า 30
          (สามสิบ) วัน ก่อนที่จะเลิกสัญญานี้ได้
          โดยไม่จำเป็นต้องแจ้งเหตุผลของการเลิกสัญญา
          และไม่ถือว่าคู่สัญญาฝ่ายนั้นผิดสัญญาแต่ประการใด
        </Clause>
      ),
    },
    {
      key: "c3",
      node: (
        <Clause n={3}>
          ผู้รับจ้างจะจัดหาพนักงานรักษาความสะอาดเข้าปฏิบัติหน้าที่ตามสัญญา
          รายละเอียดตามเอกสารแนบท้ายสัญญา 1
        </Clause>
      ),
    },
    {
      key: "c4",
      keepWithNext: true,
      node: (
        <Clause n={4}>
          ผู้รับจ้างจะต้องจัดหาพนักงานรักษาความสะอาดเสริมหรือทดแทน
          กรณีที่พนักงานรักษาความสะอาดประจำมาปฏิบัติหน้าที่ไม่ได้
          โดยผู้รับจ้างจะเป็นผู้กำหนดวันหยุดของพนักงานของผู้รับจ้างเอง
          โดยไม่กระทบกับการทำงานตามสัญญา
        </Clause>
      ),
    },
    {
      key: "c4-1",
      node: (
        <p className="clause-sub">
          หากพนักงานประจำมาไม่ได้ ผู้รับจ้างมีเวลาจัดหาพนักงานทดแทนภายใน 3
          ชั่วโมง นับจากเวลาเริ่มงานปกติ
        </p>
      ),
    },
    {
      key: "c4-2",
      node: (
        <p className="clause-sub">
          กรณีจัดหาพนักงานทดแทนไม่ได้เต็มวัน
          ผู้ว่าจ้างมีสิทธิตัดจ่ายค่าจ้างเฉพาะส่วนของพนักงานที่ไม่มาปฏิบัติงานตามอัตราส่วนรายวันจริง
          โดยคำนวณจาก (ค่าบริการรายเดือนของพนักงานตำแหน่งนั้น ÷
          จำนวนวันทำงานจริงในเดือนนั้น)
        </p>
      ),
    },
    {
      key: "c4-3",
      node: (
        <p className="clause-sub">
          กรณีจัดหาพนักงานทดแทนได้แต่ล่าช้ากว่ากำหนด
          ให้คิดค่าบริการตามส่วนชั่วโมงหรือครึ่งวันที่ได้ปฏิบัติงานจริง
        </p>
      ),
    },
    {
      key: "c4-4",
      node: (
        <p className="clause-sub">
          ผู้รับจ้างจะออกใบลดหนี้ (Credit Note)
          สำหรับยอดค่าบริการที่ถูกหักตามส่วนงานจริงดังกล่าว
          เพื่อนำไปเป็นส่วนลดในการวางบิลชำระเงินของเดือนนั้นหรือรอบถัดไป
        </p>
      ),
    },
    {
      key: "c4-5",
      node: (
        <p className="clause-sub">
          เมื่อผู้ว่าจ้างหักค่าบริการตามส่วนงานจริงที่ไม่ได้รับการปฏิบัติงานแล้ว
          ผู้ว่าจ้างตกลงจะไม่คิดค่าปรับหรือเรียกค่าเสียหายอื่นใดเพิ่มเติมอีก
          เพื่อไม่ให้ผู้รับจ้างเสียประโยชน์เกินสมควร
        </p>
      ),
    },
    {
      key: "c5",
      keepWithNext: true,
      node: (
        <Clause n={5}>
          ผู้ว่าจ้างยินดีจ่ายค่าจ้างให้กับผู้รับจ้างสำหรับพนักงานรักษาความสะอาดประจำ
          ตามรายละเอียดที่ระบุไว้ในเอกสารแนบท้ายสัญญา 1
          (ซึ่งยังไม่รวมภาษีมูลค่าเพิ่ม) ภายในวันที่ 30 ของทุก ๆ เดือน
          โดยเงื่อนไขการวางบิลหรือโอนชำระเงินให้เป็นไปตามที่ผู้ว่าจ้างกำหนด
        </Clause>
      ),
    },
    {
      key: "c5-1",
      node: (
        <p className="clause-sub">
          กรณีผู้ว่าจ้างชำระเงินล่าช้าเกินกว่าวันที่ 30 ของเดือน
          หรือเกินกำหนดชำระตามใบวางบิล
          ผู้ว่าจ้างยินยอมเสียดอกเบี้ยผิดนัดชำระในอัตราร้อยละ 3 ต่อปี
          นับแต่วันที่ครบกำหนดชำระจนกว่าจะชำระเสร็จสิ้น
        </p>
      ),
    },
    {
      key: "c6",
      node: (
        <Clause n={6}>
          หากมีการกำหนดค่าแรงขั้นต่ำใหม่โดยผลของกฎหมายแรงงาน
          ผู้ว่าจ้างตกลงยินยอมปรับค่าบริการให้กับผู้รับจ้างตามที่มีการตกลงกันในภายหลัง
        </Clause>
      ),
    },
    {
      key: "c7",
      node: (
        <Clause n={7}>
          พนักงานรักษาความสะอาดที่ผู้รับจ้างส่งมาปฏิบัติงานตามสัญญานี้
          ให้ถือว่าเป็นลูกจ้างของผู้รับจ้าง
          ซึ่งผู้รับจ้างเป็นผู้รับผิดชอบต่อลูกจ้างของตนตามที่กฎหมายบังคับ
        </Clause>
      ),
    },
    {
      key: "c8",
      node: (
        <Clause n={8}>
          ผู้ว่าจ้างจะอำนวยความสะดวกโดยจัดหากระแสไฟฟ้าและน้ำประปาที่จำเป็นเพื่อใช้ในการให้บริการทำความสะอาดตามสัญญานี้ให้เพียงพอ
          รวมทั้งจัดหาสถานที่สำหรับเก็บเครื่องมือเครื่องใช้
          และอุปกรณ์ที่จำเป็นต้องใช้ในการทำความสะอาดประจำวัน
        </Clause>
      ),
    },
    {
      key: "c9",
      node: (
        <Clause n={9}>
          การเพิ่มหรือลดจำนวนพนักงานปฏิบัติหน้าที่ หรือข้อตกลงใดๆ
          อันเกิดขึ้นภายหลังจะดำเนินการและใช้บังคับได้ต่อเมื่อได้รับความยินยอมเห็นชอบร่วมกัน
          โดยกำหนดให้ทำข้อตกลงเป็นบันทึกต่อท้ายสัญญาในแต่ละครั้งไป
        </Clause>
      ),
    },
    {
      key: "c10",
      node: (
        <Clause n={10}>
          ผู้รับจ้างตกลงจัดอุปกรณ์ให้พนักงานรักษาความสะอาดใช้ในการปฏิบัติหน้าที่ให้มีประสิทธิภาพ
          โดยมีรายละเอียดตามเอกสารแนบท้ายสัญญา 2
        </Clause>
      ),
    },
    {
      key: "c11",
      node: (
        <Clause n={11}>
          เมื่อผู้ว่าจ้างเห็นว่าพนักงานรักษาความสะอาดผู้ใดไม่เหมาะสมที่จะปฏิบัติหน้าที่
          และได้แจ้งให้ผู้รับจ้างรับทราบแล้ว
          ผู้รับจ้างจะต้องดำเนินการแก้ไขหรือเปลี่ยนตัวพนักงานรักษาความสะอาดใหม่ที่เหมาะสมให้แก่ผู้ว่าจ้างทันที
        </Clause>
      ),
    },
    {
      key: "c12",
      node: (
        <Clause n={12}>
          ภายในเวลา 3 เดือนนับแต่สัญญานี้สิ้นสุด
          ผู้ว่าจ้างหรือบุคคลที่ผู้ว่าจ้างมีส่วนได้เสียจะต้องไม่รับพนักงานทำความสะอาดของผู้รับจ้างเป็นลูกจ้างของผู้ว่าจ้างหรือของบุคคลที่ผู้ว่าจ้างมีส่วนได้เสีย
          เว้นแต่จะได้รับความยินยอมจากผู้รับจ้าง
        </Clause>
      ),
    },
    {
      key: "c13",
      keepWithNext: true,
      node: (
        <Clause n={13}>ผู้รับจ้างจะต้องรับผิดชอบต่อผู้ว่าจ้างดังนี้</Clause>
      ),
    },
    {
      key: "c13-1",
      node: (
        <p className="clause-sub">
          13.1 ผู้รับจ้างยินดีจะดูแลรักษาสถานที่หรือบริเวณทำความสะอาดของผู้ว่าจ้างให้สะอาดอยู่เสมอ
        </p>
      ),
    },
    {
      key: "c13-2",
      node: (
        <p className="clause-sub">
          13.2 ผู้รับจ้างได้จัดให้มีแบบฟอร์มพนักงาน มีตราสัญลักษณ์ของผู้รับจ้าง
          และบัตรประจำตัวพนักงาน
        </p>
      ),
    },
    {
      key: "c13-3",
      node: (
        <p className="clause-sub">
          13.3 พนักงานของผู้รับจ้างจะต้องปฏิบัติตามระเบียบข้อบังคับที่ผู้ว่าจ้างกำหนด
        </p>
      ),
    },
    {
      key: "c13-4",
      node: (
        <p className="clause-sub">
          13.4 จัดหาและส่งพนักงานทำความสะอาดที่ดี ซื่อสัตย์
          มีความระมัดระวังรอบคอบมาทำงาน
        </p>
      ),
    },
    {
      key: "c13-5",
      node: (
        <p className="clause-sub">
          13.5 ผู้รับจ้างจะต้องรับผิดชอบต่อความเสียหายแก่ทรัพย์สินของผู้ว่าจ้างอันเกิดจากการกระทำของพนักงานของผู้รับจ้างโดยผ่านการสอบสวนร่วมกันเป็นที่แน่ชัดแล้ว
          โดยผู้รับจ้างยอมชดใช้ในวงเงินครั้งละไม่เกิน 10,000 บาท ภายใน 15 วัน
          หลังจากการสอบสวนเป็นที่ยุติ
        </p>
      ),
    },
    {
      key: "c14",
      node: (
        <Clause n={14}>
          พนักงานของผู้รับจ้างจะต้องลงบันทึกเวลาเริ่มทำงานและเวลาเลิกงานทุกครั้งไว้เป็นหลักฐาน
        </Clause>
      ),
    },
    {
      key: "c15",
      node: (
        <Clause n={15}>
          ผู้ว่าจ้างหรือผู้รับจ้าง มีสิทธิบอกเลิกสัญญาฉบับนี้ได้ทันที
          หากปรากฏว่าฝ่ายใดฝ่ายหนึ่งได้ทำผิดสัญญา
          โดยจะต้องแจ้งให้อีกฝ่ายหนึ่งทราบเป็นลายลักษณ์อักษรล่วงหน้าอย่างน้อย 30
          วัน
        </Clause>
      ),
    },
    {
      key: "c16",
      keepWithNext: true,
      node: (
        <Clause n={16}>
          การบอกกล่าวใดๆ ตามสัญญานี้ต้องทำเป็นหนังสือและแจ้งไปยังคู่สัญญาอีกฝ่ายหนึ่งตามที่อยู่ข้างต้น
        </Clause>
      ),
    },
    {
      key: "closing",
      keepWithNext: true,
      node: (
        <p className="contract-indent mt-3">
          สัญญานี้ทำขึ้นเป็นสองฉบับมีข้อความถูกต้องตรงกัน
          คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความทั้งหมดโดยตลอดแล้วเห็นว่าถูกต้องตรงตามเจตนาของตน
          จึงได้ลงลายมือชื่อพร้อมประทับตราไว้เป็นสำคัญต่อหน้าพยาน
        </p>
      ),
    },
    { key: "sign-main", node: <SignatureBlock ctx={ctx} /> },
  ];

  const annex1Blocks: PageBlock[] = [
    {
      key: "a1-title",
      keepWithNext: true,
      node: <DocumentTitle title="เอกสารแนบท้ายสัญญา 1" />,
    },
    {
      key: "a1-org",
      node: (
        <p className="mt-4">
          หน่วยงาน: <Fill value={ctx.client_name} />
        </p>
      ),
    },
    {
      key: "a1-area",
      node: (
        <p>
          พื้นที่ให้บริการ: <Fill value={ctx.client_address} />
        </p>
      ),
    },
    {
      key: "a1-table-h",
      keepWithNext: true,
      node: (
        <p className="mt-3 font-semibold">
          จำนวนพนักงาน, วันเวลาปฏิบัติหน้าที่ และอัตราค่าบริการ
        </p>
      ),
    },
    {
      key: "a1-table",
      node: (
        <div className="contract-table-wrap mt-2 overflow-x-auto">
          <table className="contract-table">
            <thead>
              <tr>
                <th>ตำแหน่งงาน</th>
                <th>วันปฏิบัติงาน</th>
                <th>เวลาปฏิบัติงาน</th>
                <th>จำนวน</th>
                <th>ค่าจ้าง/คน (บาท/เดือน)</th>
                <th>รวมค่าจ้าง (บาท/เดือน)</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <Fill value={role.title} fallback="........" />
                  </td>
                  <td>
                    <Fill value={ctx.work_days} fallback="........" />
                  </td>
                  <td>
                    <Fill value={ctx.work_hours} fallback="........" />
                  </td>
                  <td>
                    {role.count > 0 ? `${role.count} คน` : "...... คน"}
                  </td>
                  <td className="text-right">
                    {role.price_per_head > 0
                      ? `${role.price_per_head_text} บาท`
                      : "........ บาท"}
                  </td>
                  <td className="text-right">
                    {role.monthly > 0
                      ? `${role.monthly_text} บาท`
                      : "........ บาท"}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>รวม</td>
                <td />
                <td />
                <td>
                  {ctx.staff_count > 0
                    ? `${ctx.staff_count} คน`
                    : "...... คน"}
                </td>
                <td />
                <td className="text-right">
                  {ctx.monthly_total_raw > 0
                    ? `${ctx.monthly_total} บาท`
                    : "........ บาท"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      key: "a1-days",
      node: (
        <p className="mt-3">
          ปฏิบัติงาน: <Fill value={ctx.work_days} />{" "}
          (หยุดนักขัตฤกษ์ยึดตามผู้ว่าจ้าง)
        </p>
      ),
    },
    {
      key: "a1-holiday",
      node: ctx.holiday_included_in_rate ? (
        <p>
          ค่าบริการตามสัญญานี้รวมค่าทำงานในวันหยุดนักขัตฤกษ์แล้ว
          โดยไม่คิดค่าบริการเพิ่มกรณีผู้ว่าจ้างต้องการให้พนักงานปฏิบัติงานในวันหยุดนักขัตฤกษ์
        </p>
      ) : (
        <p>
          กรณีผู้ว่าจ้างต้องการให้พนักงานปฏิบัติงานในวันหยุดนักขัตฤกษ์
          คิดค่าบริการเพิ่มในอัตรา{" "}
          <Fill value={ctx.holiday_rate} fallback="......" /> บาท/คน/วัน
          หรืออัตราชั่วโมงละ <Fill value={ctx.ot_rate} fallback="......" /> บาท
          ตามที่คู่สัญญาตกลงกัน
        </p>
      ),
    },
    {
      key: "a1-term",
      node: (
        <p>
          ระยะเวลาสัญญา: วันที่ <Fill value={startDate} /> ถึงวันที่{" "}
          <Fill value={endDate} />
        </p>
      ),
    },
    {
      key: "a1-total",
      node: (
        <p>
          อัตราค่าบริการตลอดสัญญา ({monthsLabel || "......"} เดือน):{" "}
          <Fill
            value={
              ctx.total_contract_price_raw > 0
                ? `${ctx.total_contract_price} บาท`
                : ""
            }
          />{" "}
          (
          <Fill
            value={
              ctx.total_contract_price_raw > 0 ? ctx.total_price_text : ""
            }
          />
          )
        </p>
      ),
    },
    {
      key: "a1-note-h",
      keepWithNext: true,
      node: <p className="mt-3 font-semibold">หมายเหตุ :</p>,
    },
    {
      key: "a1-note-1",
      node: <p className="clause-sub">1. ราคาดังกล่าวยังไม่รวมภาษีมูลค่าเพิ่ม</p>,
    },
    {
      key: "a1-note-2",
      node: (
        <p className="clause-sub">
          2. กรณีพนักงานทำงานล่วงเวลาในวันทำงาน อัตราค่าบริการชั่วโมงละ{" "}
          <Fill value={ctx.ot_rate} fallback="......" /> บาท
          {ctx.holiday_included_in_rate
            ? " สำหรับวันทำงานปกติ"
            : " ทั้งนี้ไม่รวมวันนักขัตฤกษ์"}
        </p>
      ),
    },
    {
      key: "a1-note-3",
      keepWithNext: true,
      node: (
        <p className="clause-sub">
          3. ในกรณีที่พนักงานทำความสะอาดลาป่วยหรือลากิจล่วงหน้า
          ผู้รับจ้างต้องจัดส่งพนักงานเข้าทดแทนภายใน 3
          ชั่วโมงจากเวลาเริ่มงานปกติ หากจัดหาไม่ได้หรือมาปฏิบัติงานได้บางส่วน
          ให้หักค่าบริการตามส่วนงานจริงและออกใบลดหนี้ (Credit Note)
          ตามเงื่อนไขข้อ 4 ของสัญญาหลัก โดยไม่คิดค่าปรับเพิ่มเติม
        </p>
      ),
    },
    { key: "sign-a1", node: <SignatureBlock ctx={ctx} /> },
  ];

  const annex2Blocks: PageBlock[] = [
    {
      key: "a2-title",
      keepWithNext: true,
      node: (
        <DocumentTitle
          title="เอกสารแนบท้ายสัญญา 2"
          subtitle="ขอบเขตงานและรายการอุปกรณ์/น้ำยาทำความสะอาด"
        />
      ),
    },
    {
      key: "a2-ref",
      node: (
        <p className="mt-4">
          อ้างอิงสัญญาเลขที่ <Fill value={ctx.contract_no} /> หน่วยงาน{" "}
          <Fill value={ctx.client_name} />
        </p>
      ),
    },
    {
      key: "a2-scope-h",
      keepWithNext: true,
      node: (
        <p className="mt-4 font-semibold">1. ขอบเขตงานและพื้นที่ให้บริการ</p>
      ),
    },
    {
      key: "a2-scope",
      node: (
        <MultilineFill
          value={ctx.sow_scope}
          fallback=".............................................................................................................................................."
        />
      ),
    },
    {
      key: "a2-eq-h",
      keepWithNext: true,
      node: <p className="mt-4 font-semibold">2. รายการอุปกรณ์และวัสดุ</p>,
    },
    ...(ctx.include_equipment
      ? [
          ...itemBlocks(
            "a2-tools",
            "2.1 อุปกรณ์ / เครื่องมือทั่วไป",
            splitLines(ctx.sow_tools),
            "..............................................................................................................................................",
            2
          ),
          ...itemBlocks(
            "a2-elec",
            "2.2 เครื่องใช้ไฟฟ้า",
            splitLines(ctx.sow_electrical),
            "..............................................................................................................................................",
            2
          ),
          ...itemBlocks(
            "a2-mat",
            "2.3 วัสดุและน้ำยาที่ใช้ร่วมกัน",
            splitLines(ctx.sow_shared_materials),
            "..............................................................................................................................................",
            2
          ),
          ...itemBlocks(
            "a2-cons",
            "3. วัสดุสิ้นเปลืองที่ระบุในสัญญา",
            ctx.consumable_lines,
            ".............................................................................................................................................."
          ),
        ]
      : [
          {
            key: "a2-excluded",
            node: (
              <p className="mt-2 leading-6">
                ไม่รวมอยู่ในค่าจ้างตามสัญญานี้ — ผู้ว่าจ้างเป็นผู้จัดหาอุปกรณ์
                เครื่องมือ เครื่องใช้ไฟฟ้า น้ำยาทำความสะอาด และวัสดุสิ้นเปลืองเอง{" "}
                ({ctx.equipment_clause})
              </p>
            ),
          } satisfies PageBlock,
        ]),
    { key: "sign-a2", node: <SignatureBlock ctx={ctx} /> },
  ];

  return (
    <div id="contract-print" className="contract-print-root">
      <PagedArticle header={letterhead} blocks={mainBlocks} />
      <PagedArticle header={letterhead} blocks={annex1Blocks} />
      <PagedArticle header={letterhead} blocks={annex2Blocks} />
    </div>
  );
}
