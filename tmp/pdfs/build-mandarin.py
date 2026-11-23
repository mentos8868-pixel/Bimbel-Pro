
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold')
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
out=Path('output/pdf/rangkuman-mandarin-usia-4-5.pdf')
out.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(out),pagesize=A4)
c.setTitle('Belajar Mandarin untuk Anak Usia 4–5 Tahun')
W,H=A4
ink='#193044'
muted='#475D6E'
accent='#176C63'
def txt(t,y,size=11,font='Arial',color=ink,x=48,w=499):
    p=Paragraph(t,ParagraphStyle('p',fontName=font,fontSize=size,leading=size*1.42,textColor=HexColor(color)))
    _,h=p.wrap(w,800)
    p.drawOn(c,x,y-h)
    return y-h
def zh(t): return '<font name="STSong-Light">'+t+'</font>'
def head(n,title,subtitle,cn):
    c.setFillColor(HexColor('#E9F5F1'))
    c.rect(0,H-173,W,173,fill=1,stroke=0)
    txt('MANDARIN UNTUK ANAK USIA 4–5 TAHUN',H-36,10,'Arial-Bold',accent)
    txt(title,H-60,30,'Arial-Bold')
    txt(zh(cn),H-106,16)
    txt(subtitle,H-137,12,color=muted)
    c.setStrokeColor(HexColor('#CFDDD9'))
    c.line(48,46,W-48,46)
    txt('Telaah materi publik  •  22 November 2026',37,9,color=muted)
    txt(str(n)+' / 2',37,9,color=muted,x=520,w=40)
    return H-193
def section(t,y): return txt(t,y,15,'Arial-Bold',accent)-7
def block(label,body,y): return txt('<b>'+label+'</b> '+body,y)-7
def source(label,url): return '<link href="'+url+'" color="'+accent+'"><u>'+label+'</u></link>'

y=head(1,'iHuman Chinese','Mengenal hanzi, bunyi, dan maknanya dalam konteks','洪恩识字')
y=txt('Pengembang menargetkan usia 3–8 tahun. Peta belajar bergerak dari pengenalan hanzi ke karakter yang sering dipakai sehari-hari, lalu ke materi lanjutan.',y)-14
y=section('Cara belajarnya',y)
for label,body in [
('1. Bermain.','Aktivitas interaktif memperkenalkan karakter.'),
('2. Mengenali.','Animasi mengaitkan bentuk karakter, bunyi, dan makna.'),
('3. Berlatih.','Anak memilih karakter yang sesuai dengan bunyi atau mencocokkan karakter dengan pelafalannya.'),
('4. Menulis.','Anak mencoba gerakan dasar dan mengenali ciri goresan.'),
('5. Mengucapkan.','Anak memakai karakter dalam kata dan frasa pendek.')]:
    y=block(label,body,y)
y=txt('Ulasan harian dan cek berkala mengulang materi. Buku cerita bertahap memakai terutama hanzi yang sudah dipelajari agar anak berjumpa lagi dengan karakter itu dalam kalimat.',y)-14
y=section('Topik dan materi',y)
y=txt('Bagian hanzi sehari-hari mencakup 12 tema, antara lain alam, keluarga, dan dapur. Laman resmi juga menyebut pengetahuan sehari-hari, astronomi, dan geografi. Materi lanjutan mencakup goresan, radikal, serta idiom Mandarin.',y)-14
y=section('Contoh satu sesi',y)
y=txt('Lihat animasi hujan, dengarkan '+zh('雨')+' (yǔ, hujan), lalu ajak anak menunjuk gambar hujan dan menirukan '+zh('下雨了')+' (xià yǔ le, sedang hujan). Untuk usia 4–5, coba satu karakter yang dekat dengan pengalaman anak.',y)-13
y=txt('Sumber '+source('Situs resmi iHuman','https://www.ihuman.com/shizi')+'  •  '+source('Deskripsi App Store Tiongkok','https://apps.apple.com/cn/app/%E6%B4%AA%E6%81%A9%E8%AF%86%E5%AD%97-%E5%84%BF%E7%AB%A5%E8%AF%86%E5%AD%97%E5%90%AF%E8%92%99%E5%BF%85%E5%A4%87/id1139733348'),y,9,color=muted)
assert y>53,y
c.showPage()

y=head(2,'BabyBus Mandarin','Mendengar dan menirukan Mandarin lewat lagu, cerita, dan permainan','宝宝巴士')
y=txt('BabyBus menyediakan katalog lagu dan animasi, cerita audio, serta permainan interaktif. Keluarga bisa memilih materi per tema sesuai minat anak.',y)-14
y=section('Cara belajarnya',y)
for label,body in [
('Lagu dan animasi.','Anak mendengar frasa Mandarin sambil melihat aksi dan dapat menirukan kata, bunyi, atau gerakannya.'),
('Cerita audio.','Dengarkan cerita pendek bersama, lalu ajak anak menunjuk tokoh atau benda dari cerita. Aplikasi audio BabyBus mencantumkan lagu anak dan cerita pengantar tidur.'),
('Permainan interaktif.','Anak berinteraksi dengan benda dan situasi. Pada permainan toko kue, nama bahan dipasangkan dengan gambar, pelafalan, dan cara mengolahnya.')]:
    y=block(label,body,y)
y=section('Topik dan contoh dari katalog',y-5)
for label,body in [
('Rutinitas dan kebersihan.','Mandi, menyikat gigi, dan merapikan mainan.'),
('Emosi dan hubungan sosial.','Mengenali perasaan, berbagi, dan membantu.'),
('Hewan, kendaraan, dan makanan.','Anak ayam, bus, sarapan, serta buah.'),
('Keselamatan.','Bahaya di permukaan es dan kehati-hatian dengan tali layang-layang.'),
('Konsep awal.','Angka 1–5, bentuk, besar-kecil, serta siang dan malam.')]:
    y=block(label,body,y)
y=section('Contoh satu sesi',y-5)
y=txt('Putar lagu menyikat gigi ('+zh('宝宝爱刷牙')+'). Tirukan gerakan bersama, lalu ucapkan '+zh('刷牙')+' (shuā yá, menyikat gigi) lagi saat anak memegang sikat giginya.',y)-10
y=txt('Sumber '+source('Katalog lagu dan animasi','https://cn.babybus.com/product/video')+'  •  '+source('Permainan toko kue','https://cn.babybus.com/product/app/detail?id=25')+'  •  '+source('Aplikasi audio di Google Play','https://play.google.com/store/apps/details?hl=id&amp;id=com.sinyee.babybus.story'),y,9,color=muted)-6
y=txt('Cakupan telaah: laman resmi dan deskripsi toko aplikasi yang tersedia untuk umum. Materi di balik akun atau langganan berada di luar cakupan.',y,8.5,color=muted)
assert y>53,y
c.save()


