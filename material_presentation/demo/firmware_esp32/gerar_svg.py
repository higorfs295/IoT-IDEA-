#!/usr/bin/env python3
# Gera LIGACAO_ESP32.svg (esquematico de pinos) e COMPONENTES.svg (blocos)
import os
OUT = os.path.dirname(os.path.abspath(__file__))

NAVY="#0f2c4c"; BLUE="#2563eb"; STEEL="#4a6fa5"; CYAN="#38bdf8"
GOOD="#2e7d5b"; BAD="#b4442e"; LINE="#c9d6e5"; MUTED="#7e8fa6"; BG="#eef3f8"; CARD="#ffffff"

# ---------------------------------------------------------------- ESQUEMÁTICO
def esquematico():
    W,H=940,560
    def box(x,y,w,h,fill,stroke=LINE,rx=8,sw=1.5):
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
    def t(x,y,s,size=13,fill=NAVY,bold=False,anchor="start",mono=False):
        fam="Consolas,monospace" if mono else "Segoe UI,Arial,sans-serif"
        w='font-weight="700"' if bold else ''
        return f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" {w}>{s}</text>'
    def wire(x1,y1,x2,y2,color=STEEL,dash="",w=2):
        d=f'stroke-dasharray="{dash}"' if dash else ""
        return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{w}" {d}/>'
    def dot(x,y,color=STEEL):
        return f'<circle cx="{x}" cy="{y}" r="3.5" fill="{color}"/>'

    s=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="Segoe UI,Arial,sans-serif">']
    s.append(f'<rect width="{W}" height="{H}" fill="{BG}"/>')
    s.append(t(28,40,"Esquematico — Fechadura IoT (ESP32 + sensores)",20,NAVY,True))
    s.append(t(28,62,"Seminario G6 · Seguranca em IoT — versao fisica",13,MUTED))

    # ---- ESP32 no centro-esquerda ----
    ex,ey,ew,eh=300,110,180,380
    s.append(box(ex,ey,ew,eh,NAVY,NAVY,10,2))
    s.append(t(ex+ew/2,ey+30,"ESP32",18,"#ffffff",True,"middle"))
    s.append(t(ex+ew/2,ey+50,"DevKit v1",12,"#9fb4ce","middle"))

    # pinos: (nome, y, lado, cor_fio)
    pin_y0=ey+85
    right=[("VIN/5V",STEEL),("GPIO26",BAD),("GPIO25",GOOD),("GPIO27",STEEL),("GPIO33",BAD),("GPIO4",STEEL)]
    left =[("3V3",STEEL),("GND",STEEL),("GPIO34",BLUE)]
    coordsR={}; coordsL={}
    for i,(name,col) in enumerate(right):
        y=pin_y0+i*46
        s.append(f'<rect x="{ex+ew-6}" y="{y-9}" width="12" height="18" fill="{CYAN}"/>')
        s.append(t(ex+ew-14,y+4,name,12,"#dbe8f7","end"))
        coordsR[name]=(ex+ew+6,y)
    for i,(name,col) in enumerate(left):
        y=pin_y0+i*46
        s.append(f'<rect x="{ex-6}" y="{y-9}" width="12" height="18" fill="{CYAN}"/>')
        s.append(t(ex+14,y+4,name,12,"#dbe8f7"))
        coordsL[name]=(ex-6,y)

    # ---- coluna de componentes a direita ----
    rx=640; cw=270
    comps=[
        ("VIN/5V","Modulo Rele (trava)","IN<-GPIO26 · VCC 5V · GND",STEEL,NAVY),
        ("GPIO26","",""," ",""),  # placeholder (rele ja acima)
    ]
    # desenhamos manualmente para casar cada fio a um bloco
    blocks=[
        ("GPIO26","Modulo Rele (trava)","IN &#8592; GPIO26 · VCC 5V · GND",BAD,NAVY,150),
        ("GPIO25","LED verde","GPIO25 &#8594; [330] -> GND",GOOD,GOOD,215),
        ("GPIO27","Buzzer ativo 5V","+ &#8592; GPIO27 · - GND",STEEL,NAVY,280),
        ("GPIO33","LED vermelho (opc.)","GPIO33 &#8594; [330] -> GND",BAD,BAD,345),
        ("GPIO4","DHT22 (temp+umid)","DATA &#8594; GPIO4 · VCC 3V3 · GND",STEEL,NAVY,410),
    ]
    for pin,tit,sub,wcol,tc,by in blocks:
        s.append(box(rx,by,cw,52,CARD))
        s.append(t(rx+12,by+22,tit,13,tc,True))
        s.append(t(rx+12,by+40,sub,10,MUTED))
        x1,y1=coordsR[pin]
        ymid=by+26
        # roteamento em L: sai do pino, vai reto ate x=rx-30, sobe/desce, entra no bloco
        elbow=rx-30
        s.append(wire(x1,y1,elbow,y1,wcol))
        s.append(wire(elbow,y1,elbow,ymid,wcol))
        s.append(wire(elbow,ymid,rx,ymid,wcol))
        s.append(dot(x1,y1,wcol))

    # ---- inset do divisor NTC (canto inferior esquerdo, isolado) ----
    ix,iy,iw,ih=40,300,210,200
    s.append(box(ix,iy,iw,ih,CARD))
    s.append(t(ix+14,iy+24,"Divisor NTC 10k",13,NAVY,True))
    cx=ix+55
    s.append(t(cx,iy+50,"3V3",11,STEEL,True,"middle"))
    s.append(wire(cx,iy+56,cx,iy+70))
    s.append(f'<rect x="{cx-16}" y="{iy+70}" width="32" height="34" fill="none" stroke="{NAVY}" stroke-width="1.5"/>')
    s.append(t(cx,iy+92,"NTC",10,NAVY,False,"middle"))
    s.append(wire(cx,iy+104,cx,iy+120))
    s.append(dot(cx,iy+120,BLUE))
    s.append(t(cx+24,iy+124,"&#8594; GPIO34",11,BLUE,True))
    s.append(f'<rect x="{cx-16}" y="{iy+120}" width="32" height="34" fill="none" stroke="{NAVY}" stroke-width="1.5"/>')
    s.append(t(cx,iy+142,"10k",10,NAVY,False,"middle"))
    s.append(wire(cx,iy+154,cx,iy+170))
    s.append(t(cx,iy+186,"GND",11,STEEL,True,"middle"))

    # fio do inset ao GPIO34 (linha azul limpa por baixo do ESP)
    x34,y34=coordsL["GPIO34"]
    s.append(wire(cx+16,iy+120,ix+iw+20,iy+120,BLUE))
    s.append(wire(ix+iw+20,iy+120,ix+iw+20,y34,BLUE))
    s.append(wire(ix+iw+20,y34,x34,y34,BLUE))

    # alimentacao 3V3/GND (indicativa, tracejada)
    x3,y3=coordsL["3V3"]; xg,yg=coordsL["GND"]
    s.append(t(ex-70,y3+4,"&#8594; 3V3 sensores",10,MUTED,False,"end"))
    s.append(t(ex-70,yg+4,"&#8594; GND comum",10,MUTED,False,"end"))

    s.append(t(28,H-20,"Cores: azul=leitura ADC (NTC) · verde=LED verde · vermelho=rele/alerta · cinza=alimentacao/sinal",11,MUTED))
    s.append("</svg>")
    open(os.path.join(OUT,"LIGACAO_ESP32.svg"),"w").write(chr(10).join([x for x in s if x]))
    print("LIGACAO_ESP32.svg (limpo)")

# ---------------------------------------------------------------- COMPONENTES (blocos)
def componentes():
    W,H=940,540
    def box(x,y,w,h,fill,stroke=LINE,rx=10,sw=1.5):
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
    def t(x,y,s,size=13,fill=NAVY,bold=False,anchor="start"):
        w='font-weight="700"' if bold else ''
        return f'<text x="{x}" y="{y}" font-family="Segoe UI,Arial,sans-serif" font-size="{size}" fill="{fill}" text-anchor="{anchor}" {w}>{s}</text>'
    def arrow(x1,y1,x2,y2,color=STEEL,label="",dash=""):
        d=f'stroke-dasharray="{dash}"' if dash else ""
        mid=((x1+x2)/2,(y1+y2)/2)
        lab=t(mid[0],mid[1]-6,label,11,color,True,"middle") if label else ""
        return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="2.2" marker-end="url(#ah)" {d}/>'+lab)
    s=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="Segoe UI,Arial,sans-serif">']
    s.append(f'<defs><marker id="ah" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="{STEEL}"/></marker></defs>')
    s.append(f'<rect width="{W}" height="{H}" fill="{BG}"/>')
    s.append(t(28,40,"Diagrama de componentes — Demo de Segurança em IoT",20,NAVY,True))
    s.append(t(28,62,"Sensores → Dispositivo (ESP32/VM) → Rede → Atacante (Kali)",13,MUTED))

    # sensores (esquerda)
    s.append(box(40,110,190,150,CARD)); s.append(t(60,135,"SENSORES",12,STEEL,True))
    s.append(box(58,150,154,44,BG)); s.append(t(70,170,"DHT22",13,NAVY,True)); s.append(t(70,186,"temp + umidade",10,MUTED))
    s.append(box(58,202,154,44,BG)); s.append(t(70,222,"NTC 10k",13,NAVY,True)); s.append(t(70,238,"temperatura (ADC)",10,MUTED))

    # dispositivo (centro)
    s.append(box(300,100,300,300,NAVY,NAVY,12,2))
    s.append(t(450,128,"DISPOSITIVO IoT",15,"#fff",True,"middle"))
    s.append(t(450,146,"ESP32 físico  ·  ou  VM simulada",11,"#9fb4ce","middle"))
    s.append(box(322,165,256,50,"#12385f","#274a6b"))
    s.append(t(338,186,"Painel web (HTTP)",13,"#dbe8f7",True)); s.append(t(338,203,"login admin/admin  →  destrava",10,"#9fb4ce"))
    s.append(box(322,225,256,50,"#12385f","#274a6b"))
    s.append(t(338,246,"Cliente MQTT",13,"#dbe8f7",True)); s.append(t(338,263,"assina casa/porta · publica casa/telemetria",9.5,"#9fb4ce"))
    s.append(box(322,285,256,90,"#12385f","#274a6b"))
    s.append(t(338,306,"Atuadores / feedback",13,"#dbe8f7",True))
    s.append(t(338,326,"relé (trava) · LED verde/vermelho",10,"#9fb4ce"))
    s.append(t(338,342,"buzzer · painel ao vivo",10,"#9fb4ce"))
    s.append(t(338,360,"(modo tela quando sem atuador)",9.5,"#7d93b0"))

    # atacante (direita)
    s.append(box(670,110,230,290,CARD)); s.append(t(690,135,"VM KALI (atacante)",12,BAD,True))
    for i,(nome,desc,c) in enumerate([
        ("Wireshark","captura tráfego em claro",BAD),
        ("hydra","brute force do login HTTP",BAD),
        ("mosquitto (broker)","MQTT + injeção de comando",BAD),
    ]):
        yy=155+i*72
        s.append(box(688,yy,196,58,BG))
        s.append(t(702,yy+22,nome,13,NAVY,True)); s.append(t(702,yy+40,desc,10,MUTED))

    # setas
    s.append(arrow(230,185,300,190,STEEL,"leitura"))
    s.append(arrow(230,224,300,250,STEEL))
    s.append(arrow(600,190,688,184,BAD,"HTTP sem TLS"))
    s.append(arrow(600,250,688,264,BAD,"MQTT sem TLS"))
    s.append(arrow(688,300,600,320,GOOD,"injeta abrir"))

    # faixa da rede
    s.append(box(40,430,860,70,"#e3ecf6","#c9d6e5"))
    s.append(t(60,458,"Rede interna / host-only (mesma sub-rede, isolada)",13,NAVY,True))
    s.append(t(60,478,"VM ESP32-simulado  ·  VM Kali (broker aqui)  ·  ou ESP32 físico — atacar apenas o próprio dispositivo",11,MUTED))
    s.append("</svg>")
    open(os.path.join(OUT,"COMPONENTES.svg"),"w").write("\n".join([x for x in s if x]))
    print("COMPONENTES.svg")

esquematico()
componentes()
