---
titel: Ohmsches Gesetz und Kirchhoff – Grundlagen
stufe: leicht
beschreibung: Strom, Spannung und Widerstand, Reihen- und Parallelschaltung, Knotenregel und Spannungsfall auf der Leitung.
---
# Ohmsches Gesetz und Kirchhoff – Grundlagen

Name: ___  Datum: ___

Benötigte Formeln: $U = R \cdot I$, $P = U \cdot I$, Reihe $R_\text{g} = R_1 + R_2 + \dots$, parallel $\frac{1}{R_\text{g}} = \frac{1}{R_1} + \frac{1}{R_2} + \dots$

## Aufgabe 1 – Heizstab

Ein Heizstab hat einen Widerstand von 23 Ω und liegt an 230 V.

1. Wie groß ist der Strom?
2. Welche Leistung nimmt er auf?

:::lösung
$I = \dfrac{U}{R} = \dfrac{230\ \text{V}}{23\ \Omega} = 10\ \text{A}$

$P = U \cdot I = 230\ \text{V} \cdot 10\ \text{A} = 2\,300\ \text{W}$
:::

## Aufgabe 2 – Reihenschaltung

Drei Widerstände $R_1 = 100\ \Omega$, $R_2 = 220\ \Omega$ und $R_3 = 330\ \Omega$ liegen in Reihe an 24 V.

1. Berechne den Gesamtwiderstand und den Strom.
2. Berechne die Teilspannungen und prüfe mit der Maschenregel.

:::tipp
In der Reihenschaltung fließt durch alle Widerstände derselbe Strom.
:::

:::lösung
$R_\text{g} = 100 + 220 + 330 = 650\ \Omega$, $I = \dfrac{24\ \text{V}}{650\ \Omega} = 36{,}9\ \text{mA}$

| Widerstand | Teilspannung |
|---|---:|
| $R_1$ | 3,69 V |
| $R_2$ | 8,12 V |
| $R_3$ | 12,18 V |
| **Summe** | **24,0 V** |
:::

## Aufgabe 3 – Parallelschaltung

$R_1 = 60\ \Omega$ und $R_2 = 40\ \Omega$ liegen parallel an 12 V. Berechne die Zweigströme, den Gesamtstrom und den Ersatzwiderstand.

:::lösung
$I_1 = \dfrac{12\ \text{V}}{60\ \Omega} = 0{,}2\ \text{A}$, $I_2 = \dfrac{12\ \text{V}}{40\ \Omega} = 0{,}3\ \text{A}$, $I_\text{g} = 0{,}5\ \text{A}$

$R_\text{g} = \dfrac{R_1 \cdot R_2}{R_1 + R_2} = \dfrac{60 \cdot 40}{100}\ \Omega = 24\ \Omega$ – kleiner als der kleinste Einzelwiderstand.
:::

## Aufgabe 4 – Knotenregel

In einen Knoten fließen 2,5 A und 1,2 A hinein. Heraus fließen 0,8 A und ein unbekannter Strom $I_4$. Wie groß ist $I_4$?

:::lösung
Summe hinein = Summe heraus: $2{,}5 + 1{,}2 = 0{,}8 + I_4 \Rightarrow I_4 = 2{,}9\ \text{A}$
:::

## Aufgabe 5 – Spannungsfall auf der Leitung

Ein Verbraucher mit 16 A hängt an einer 25 m langen Kupferleitung mit 1,5 mm² (Hin- und Rückleiter, $\rho = 0{,}0178\ \Omega \cdot \text{mm}^2/\text{m}$) an 230 V.

1. Wie groß ist der Leitungswiderstand?
2. Wie viel Spannung fällt ab – in Volt und in Prozent?

:::lösung
$R_\text{L} = \dfrac{\rho \cdot 2 \cdot l}{A} = \dfrac{0{,}0178 \cdot 50}{1{,}5}\ \Omega = 0{,}593\ \Omega$

$\Delta U = I \cdot R_\text{L} = 16\ \text{A} \cdot 0{,}593\ \Omega = 9{,}49\ \text{V}$, das sind $\dfrac{9{,}49}{230} = 4{,}1\ \%$.

Das ist mehr als die oft geforderten 3 %. Abhilfe: größerer Querschnitt, z. B. 2,5 mm² ergibt 2,5 %.
:::
