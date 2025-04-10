// /lib/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      guideTitle: "Kasino Guide",
      guideSubtitle: "Everything you need to know about playing, earning, and winning at Kasino!",
      backToCasino: "Back to Casino",
      gamesSection: {
        title: "Games"
      },
      xpSection: {
        title: "XP & Leveling System",
        earnXP: {
          title: "Earn XP with Every Bet",
          description: "Every KAS you bet earns you 1 XP. As you accumulate XP, you'll level up and unlock amazing rewards!",
          rule1: "1 KAS bet = 1 XP earned",
          rule2: "Higher levels unlock better rewards",
          rule3: "Check your level in the navigation bar"
        },
        dailyLoot: {
          title: "Daily Loot Boxes",
          description: "As you level up, you unlock daily free loot boxes that can be opened once every 24 hours.",
          level: "Level",
          alt: "Level",
          box: "Loot Box",
          hint: "Click on the level icon in the navigation bar to open the Daily Loot Box menu."
        }
      },
      gemSection: {
        title: "Gem System",
        earnGems: {
          title: "Earn Gems as You Play",
          description: "Every bet gives you a chance to earn Gems, which can be used to open Gem Crates packed with amazing KAS rewards.",
          rule1: "Random chance to earn gems with each bet",
          rule2: "More bets = more chances to earn gems",
          rule3: "Higher gem tiers offer better rewards"
        },
        crates: {
          title: "Gem Crates",
          description: "There are 4 tiers of Gem Crates, each requiring different amounts of gems to open.",
          tier: "Tier",
          alt: "Gem Crate Tier",
          required: "Gems Required",
          hint: "Click on the Gem Display in the navigation bar to open the Gem Crate menu."
        }
      },
      referralSection: {
        title: "Referral System",
        earn: {
          title: "Earn with Friends",
          description: "Our referral system rewards you for bringing friends to Kasino. Both you and your friends get bonuses!",
          rule1: "New players get 100 XP when signing up with your referral",
          rule2: "You earn 2% of every bet your referrals make",
          rule3: "Payouts are instant – almost as fast as a KAS transaction",
          rule4: "Custom referral links available upon request"
        },
        hint: "To access your referral page, click on your name or KAS balance in the navigation bar after logging in."
      },
      finalCTA: {
        title: "Ready to Play?",
        description: "Join fellow Kaspians enjoying Kasino's exciting games and rewarding systems!",
        button: "Enter Kasino Now"
      },
      games: {
        ghostJump: {
          title: "Ghost Jump",
          description: "Experience the thrill of defying gravity in Ghost Jump! Place your bet and click the enchanted floating tile to soar higher, bigger heights mean bigger rewards and heart‐racing excitement. But remember, every leap carries a daring risk!"
        },
        kaspianCross: {
          title: "Kaspian Cross",
          description: "Challenge fate in Kaspian Cross! Bet and step onto the next tile, each move brings a chance at huge rewards while the risk of a swift Solana car increases. Are you bold enough to cross?"
        },
        crash: {
          title: "Crash",
          description: "Feel the adrenaline surge in Crash! Place your bet and watch as your multiplier climbs with a burst of speed, cash out quickly before the inevitable crash or risk it all for an even bigger win!"
        },
        mines: {
          title: "Mines",
          description: "Uncover hidden treasures in Mines! Click to reveal safe tiles and multipliers in this modern twist on a classic, one misstep and your bet is lost. Trust your instincts and play smart!"
        },
        upgrade: {
          title: "Upgrade",
          description: "Ready for a power-up? Select your desired multiplier, place your bet, and watch the countdown tick, an epic upgrade or a daring loss awaits. It’s all about the thrill of the gamble!"
        },
        kaspaTowerClimb: {
          title: "Kaspa Tower Climb",
          description: "Ascend the heights in Kaspa Tower Climb! Bet and choose a tile, if it’s safe, the iconic Kaspa logo appears; a misstep shows an X. Cash out any time after your first step for secure wins!"
        },
        guessTheCup: {
          title: "Guess The Cup",
          description: "Test your luck in Guess The Cup! Bet and decide which cup hides the secret prize, one wrong guess ends the game, but a correct call rewards you with a spectacular win!"
        },
        plinko: {
          title: "Plinko",
          description: "Embrace the unpredictability of Plinko! Drop your bet and watch the ball bounce its way to a random multiplier, simple, exciting, and full of surprises with every drop!"
        },
        roulette: {
          title: "Roulette",
          description: "Bet on your lucky charm in Roulette! Pick a color or number sequence, place your wager, and let the spinning wheel decide your fortune. Suspense and excitement collide in this classic game!"
        },
        dice: {
          title: "Dice",
          description: "Roll the dice of destiny in Dice! Choose your multiplier, place your bet, and let your luck roll, can you beat the house as the stakes get higher with every throw?"
        },
        coinFlip: {
          title: "Coin Flip",
          description: "Flip the coin of fortune! Set your wager, pick your symbol, and trust the toss, higher multipliers boost both the excitement and the risk, putting fate in your hands!"
        },
        kasperLootBox: {
          title: "Kasper Loot Box",
          description: "Unbox surprises in Kasper Loot Box! Bet 25 KAS and spin the wheel to reveal your fortune, will you strike it rich, or enjoy a small win? Every spin is a delightful mystery!"
        },
        kasenMania: {
          title: "Kasen Mania",
          description: "Dive into Kasen Mania, our electrifying slots adventure! Place your bet and let the reels spin in anticipation, align the symbols for epic bonuses, from subtle wins to massive multipliers!"
        }
      }
    }
  },
  es: {
    translation: {
      guideTitle: "Guía de Kasino",
      guideSubtitle: "¡Todo lo que necesitas saber sobre jugar, ganar y disfrutar en Kasino!",
      backToCasino: "Volver al Kasino",
      gamesSection: {
        title: "Juegos"
      },
      xpSection: {
        title: "Sistema de XP y Nivelación",
        earnXP: {
          title: "Gana XP con cada apuesta",
          description: "Cada KAS apostado te da 1 XP. ¡A medida que acumules XP, subirás de nivel y desbloquearás recompensas increíbles!",
          rule1: "1 apuesta de KAS = 1 XP ganado",
          rule2: "Niveles superiores desbloquean mejores recompensas",
          rule3: "Consulta tu nivel en la barra de navegación"
        },
        dailyLoot: {
          title: "Cajas Diarias de Botín",
          description: "A medida que subes de nivel, desbloqueas cajas diarias gratuitas que se pueden abrir una vez cada 24 horas.",
          level: "Nivel",
          alt: "Nivel",
          box: "Caja de Botín",
          hint: "Haz clic en el ícono del nivel en la barra de navegación para abrir el menú de cajas diarias."
        }
      },
      gemSection: {
        title: "Sistema de Gemas",
        earnGems: {
          title: "Gana Gemas mientras juegas",
          description: "Cada apuesta te da la oportunidad de ganar Gemas, que puedes usar para abrir Cajas de Gemas llenas de recompensas en KAS.",
          rule1: "Posibilidad aleatoria de ganar gemas con cada apuesta",
          rule2: "Más apuestas = más oportunidades de ganar gemas",
          rule3: "Niveles de gemas superiores ofrecen mejores recompensas"
        },
        crates: {
          title: "Cajas de Gemas",
          description: "Existen 4 niveles de Cajas de Gemas, cada uno requiere diferentes cantidades de gemas para abrir.",
          tier: "Nivel",
          alt: "Caja de Gemas de nivel",
          required: "Gemas requeridas",
          hint: "Haz clic en el display de gemas en la barra de navegación para abrir el menú de Cajas de Gemas."
        }
      },
      referralSection: {
        title: "Sistema de Referidos",
        earn: {
          title: "Gana con Amigos",
          description: "Nuestro sistema de referidos te recompensa por invitar amigos a Kasino. ¡Tanto tú como tus amigos obtendrán bonificaciones!",
          rule1: "Los nuevos jugadores obtienen 100 XP al registrarse con tu referido",
          rule2: "Ganas el 2% de cada apuesta que hacen tus referidos",
          rule3: "Los pagos son instantáneos - tan rápidos como una transacción KAS",
          rule4: "Enlaces de referidos personalizados disponibles para KOLs"
        },
        hint: "Para acceder a tu página de referidos, haz clic en tu nombre o balance de KAS en la barra de navegación después de iniciar sesión."
      },
      finalCTA: {
        title: "¿Listo para jugar?",
        description: "¡Únete a otros usuarios de Kasino que disfrutan de emocionantes juegos y sistemas de recompensas!",
        button: "Ingresa a Kasino Ahora"
      },
      games: {
        ghostJump: {
          title: "Salto Fantasma",
          description: "¡Vive la emoción de desafiar la gravedad en Salto Fantasma! Apuesta y haz clic en la baldosa flotante encantada para elevarte — cuanto más alto vayas, mayores las recompensas y el subidón de adrenalina. ¡Pero recuerda, cada salto conlleva un riesgo audaz!"
        },
        kaspianCross: {
          title: "Kaspian Cross",
          description: "¡Desafía al destino en Kaspian Cross! Apuesta y da un paso en la siguiente baldosa — cada movimiento ofrece la oportunidad de grandes recompensas, mientras aumenta el riesgo de ser atropellado por un coche Solana veloz. ¿Tienes el valor para cruzar?"
        },
        crash: {
          title: "Crash",
          description: "¡Siente la adrenalina en Crash! Apuesta y observa cómo tu multiplicador sube a gran velocidad — retírate antes del inevitable colapso o arriesga todo por una victoria mayor."
        },
        mines: {
          title: "Minas",
          description: "¡Descubre tesoros ocultos en Minas! Haz clic para revelar tuilas seguras y multiplicadores en esta versión moderna de un clásico — un paso en falso y pierdes tu apuesta. ¡Confía en tu instinto y juega inteligentemente!"
        },
        upgrade: {
          title: "Mejora",
          description: "¿Listo para potenciarte? Selecciona el multiplicador deseado, apuesta y observa el conteo regresivo — una mejora épica o una pérdida audaz te esperan. ¡El riesgo es parte de la emoción!"
        },
        kaspaTowerClimb: {
          title: "Kaspa Tower Climb",
          description: "¡Asciende en Kaspa Tower Climb! Apuesta y elige una baldosa — si es segura, aparecerá el icónico logo de Kaspa; si no, verás una X. ¡Retírate después de tu primer paso para asegurar tus ganancias!"
        },
        guessTheCup: {
          title: "Adivina la Copa",
          description: "¡Pon a prueba tu suerte en Adivina la Copa! Apuesta y decide qué copa oculta el premio secreto — un error y se acaba el juego, pero si aciertas, ¡una victoria espectacular te espera!"
        },
        plinko: {
          title: "Plinko",
          description: "¡Abraza la imprevisibilidad de Plinko! Apuesta y observa cómo la bola rebota hasta llegar a un multiplicador aleatorio — simple, emocionante y lleno de sorpresas en cada lanzamiento."
        },
        roulette: {
          title: "Ruleta",
          description: "¡Apuesta por tu buena suerte en la Ruleta! Escoge un color o una secuencia numérica, apuesta y deja que la rueda decida tu destino. ¡La emoción y el suspenso se fusionan en este clásico!"
        },
        dice: {
          title: "Dados",
          description: "¡Lanza los dados del destino en Dados! Elige tu multiplicador, apuesta y confía en la suerte — ¿podrás vencer a la casa mientras los riesgos se incrementan?"
        },
        coinFlip: {
          title: "Lanzamiento de Moneda",
          description: "¡Lanza la moneda de la fortuna! Establece tu apuesta, elige un símbolo y confía en el lanzamiento — multiplicadores más altos aumentan tanto la emoción como el riesgo."
        },
        kasperLootBox: {
          title: "Caja de Botín Kasper",
          description: "¡Descubre sorpresas en la Caja de Botín Kasper! Apuesta 25 KAS y haz girar la ruleta para revelar tu fortuna — ¿obtendrás un gran premio o solo una pequeña ganancia? Cada giro es un misterio encantador."
        },
        kasenMania: {
          title: "Kasen Mania",
          description: "¡Sumérgete en Kasen Mania, nuestra aventura electrizante de tragamonedas! Apuesta y observa cómo giran los carretes en anticipación — alinea los símbolos para obtener bonos épicos, desde pequeñas victorias hasta multiplicadores masivos."
        }
      }
    }
  },
  fr: {
    translation: {
      guideTitle: "Guide Kasino",
      guideSubtitle: "Tout ce dont vous avez besoin pour jouer, gagner et profiter de Kasino !",
      backToCasino: "Retour au Kasino",
      gamesSection: {
        title: "Jeux"
      },
      xpSection: {
        title: "Système d'XP et de Niveaux",
        earnXP: {
          title: "Gagnez des XP à chaque mise",
          description: "Chaque KAS misé vous rapporte 1 XP. Au fur et à mesure que vous accumulez des XP, vous montez de niveau et débloquez des récompenses incroyables !",
          rule1: "1 mise de KAS = 1 XP gagné",
          rule2: "Les niveaux supérieurs débloquent de meilleures récompenses",
          rule3: "Vérifiez votre niveau dans la barre de navigation"
        },
        dailyLoot: {
          title: "Coffres Quotidiens",
          description: "À mesure que vous montez de niveau, vous débloquez des coffres gratuits à ouvrir une fois toutes les 24 heures.",
          level: "Niveau",
          alt: "Niveau",
          box: "Coffre",
          hint: "Cliquez sur l’icône de niveau dans la barre de navigation pour ouvrir le menu des coffres quotidiens."
        }
      },
      gemSection: {
        title: "Système de Gemmes",
        earnGems: {
          title: "Gagnez des gemmes en jouant",
          description: "Chaque mise vous donne une chance de gagner des gemmes qui servent à ouvrir des coffres remplis de récompenses en KAS.",
          rule1: "Chance aléatoire de gagner des gemmes à chaque mise",
          rule2: "Plus de mises = plus de chances de gagner des gemmes",
          rule3: "Des niveaux supérieurs offrent de meilleures récompenses"
        },
        crates: {
          title: "Coffres de Gemmes",
          description: "Il existe 4 niveaux de coffres de gemmes, chacun nécessitant différentes quantités de gemmes pour être ouvert.",
          tier: "Niveau",
          alt: "Coffre de Gemmes Niveau",
          required: "Gemmes requises",
          hint: "Cliquez sur l'affichage des gemmes dans la barre de navigation pour ouvrir le menu des coffres."
        }
      },
      referralSection: {
        title: "Système de Parrainage",
        earn: {
          title: "Gagnez avec vos amis",
          description: "Notre système de parrainage vous récompense pour avoir invité vos amis à Kasino. Vous et vos amis recevez des bonus !",
          rule1: "Les nouveaux joueurs reçoivent 100 XP via votre parrainage",
          rule2: "Vous gagnez 2 % de chaque mise effectuée par vos filleuls",
          rule3: "Les paiements sont instantanés, aussi rapides qu'une transaction KAS",
          rule4: "Des liens de parrainage personnalisés sont disponibles pour les influenceurs"
        },
        hint: "Pour accéder à votre page de parrainage, cliquez sur votre nom ou votre solde KAS dans la barre de navigation après connexion."
      },
      finalCTA: {
        title: "Prêt à jouer ?",
        description: "Rejoignez d'autres joueurs qui profitent des jeux passionnants et des systèmes de récompense de Kasino !",
        button: "Entrez dans Kasino maintenant"
      },
      games: {
        ghostJump: {
          title: "Saut Fantôme",
          description: "Vivez l'excitation de défier la gravité dans Saut Fantôme ! Misez et cliquez sur la tuile flottante enchantée pour vous élever — plus vous grimpez, plus les récompenses et l'adrénaline montent, mais chaque saut comporte un risque audacieux."
        },
        kaspianCross: {
          title: "Kaspian Cross",
          description: "Affrontez le destin dans Kaspian Cross ! Misez et avancez d'une tuile — chaque pas offre l'opportunité de gains énormes, bien que le risque de collision avec une voiture Solana augmente. Osez-vous traverser ?"
        },
        crash: {
          title: "Crash",
          description: "Ressentez l'adrénaline avec Crash ! Misez et regardez votre multiplicateur grimper rapidement — encaissez avant le crash inévitable ou risquez tout pour un gain encore plus grand !"
        },
        mines: {
          title: "Mines",
          description: "Découvrez des trésors cachés dans Mines ! Cliquez pour révéler des cases sûres et des multiplicateurs dans ce classique revisité — une erreur et vous perdez votre mise. Faites confiance à votre intuition et jouez malin !"
        },
        upgrade: {
          title: "Amélioration",
          description: "Prêt pour un coup de boost ? Choisissez votre multiplicateur, misez et observez le compte à rebours — une amélioration spectaculaire ou une perte risquée vous attendent. Tout est question de frisson du risque !"
        },
        kaspaTowerClimb: {
          title: "Kaspa Tower Climb",
          description: "Montez en flèche avec Kaspa Tower Climb ! Misez et choisissez une case — si elle est sûre, le logo emblématique de Kaspa apparaît, sinon un X sera affiché. Encaissez à tout moment après le premier pas pour sécuriser vos gains."
        },
        guessTheCup: {
          title: "Devinez la Coupe",
          description: "Mettez votre chance à l'épreuve dans Devinez la Coupe ! Misez et choisissez quel verre cache le prix secret — une mauvaise réponse et c'est la fin, mais la bonne ouvre la voie à un gain spectaculaire !"
        },
        plinko: {
          title: "Plinko",
          description: "Laissez-vous surprendre par l'imprévisible Plinko ! Misez et regardez la balle rebondir vers un multiplicateur aléatoire — simple, palpitant et plein de surprises à chaque lancer."
        },
        roulette: {
          title: "Roulette",
          description: "Choisissez une couleur ou une séquence de nombres et misez dans la Roulette ! Laissez la roue décider de votre destin. Ce classique allie suspense et excitation."
        },
        dice: {
          title: "Dés",
          description: "Lancez les dés du destin ! Choisissez votre multiplicateur, misez et laissez la chance opérer — pouvez-vous battre la maison lorsque les enjeux montent ?"
        },
        coinFlip: {
          title: "Lancer de Pièce",
          description: "Lancez la pièce de la fortune ! Définissez votre mise, choisissez un symbole et laissez la pièce voler — des multiplicateurs plus élevés intensifient l'excitation et le risque."
        },
        kasperLootBox: {
          title: "Coffre de Botin Kasper",
          description: "Découvrez des surprises dans le Coffre de Botin Kasper ! Misez 25 KAS et faites tourner la roue pour révéler votre gain — remporterez-vous un gros gain ou une petite victoire ? Chaque tour est un mystère fascinant !"
        },
        kasenMania: {
          title: "Kasen Mania",
          description: "Plongez dans Kasen Mania, notre aventure électrisante de machines à sous ! Misez et observez les rouleaux tourner — alignez les symboles pour décrocher des bonus épiques, des petits gains aux multiplicateurs massifs."
        }
      }
    }
  },
  de: {
    translation: {
      guideTitle: "Kasino Anleitung",
      guideSubtitle: "Alles, was du wissen musst, um bei Kasino zu spielen, zu verdienen und zu gewinnen!",
      backToCasino: "Zurück zum Kasino",
      gamesSection: {
        title: "Spiele"
      },
      xpSection: {
        title: "XP- und Levelsystem",
        earnXP: {
          title: "Verdiene XP mit jedem Einsatz",
          description: "Jeder eingesetzte KAS bringt dir 1 XP. Mit dem Sammeln von XP steigst du im Level auf und schaltest großartige Belohnungen frei!",
          rule1: "1 KAS Einsatz = 1 XP",
          rule2: "Höhere Levels schalten bessere Belohnungen frei",
          rule3: "Sieh dein Level in der Navigationsleiste"
        },
        dailyLoot: {
          title: "Tägliche Lootboxen",
          description: "Mit steigendem Level schaltest du täglich kostenlose Lootboxen frei, die du alle 24 Stunden öffnen kannst.",
          level: "Level",
          alt: "Level",
          box: "Lootbox",
          hint: "Klicke auf das Level-Symbol in der Navigationsleiste, um das tägliche Lootbox-Menü zu öffnen."
        }
      },
      gemSection: {
        title: "Edelstein-System",
        earnGems: {
          title: "Verdiene Edelsteine beim Spielen",
          description: "Jeder Einsatz gibt dir die Chance, Edelsteine zu verdienen, mit denen du Edelsteinboxen voller KAS-Belohnungen öffnen kannst.",
          rule1: "Zufällige Chance, mit jedem Einsatz Edelsteine zu verdienen",
          rule2: "Mehr Einsätze = mehr Chancen auf Edelsteine",
          rule3: "Höhere Edelsteinstufen bieten bessere Belohnungen"
        },
        crates: {
          title: "Edelsteinboxen",
          description: "Es gibt 4 Stufen von Edelsteinboxen, die jeweils unterschiedliche Mengen an Edelsteinen zum Öffnen benötigen.",
          tier: "Stufe",
          alt: "Edelsteinbox Stufe",
          required: "Benötigte Edelsteine",
          hint: "Klicke auf die Edelsteinanzeige in der Navigationsleiste, um das Edelsteinbox-Menü zu öffnen."
        }
      },
      referralSection: {
        title: "Empfehlungssystem",
        earn: {
          title: "Verdiene mit Freunden",
          description: "Unser Empfehlungssystem belohnt dich dafür, Freunde zu Kasino einzuladen. Du und deine Freunde erhaltet Bonuszahlungen!",
          rule1: "Neue Spieler erhalten 100 XP, wenn sie sich über deine Empfehlung anmelden",
          rule2: "Du erhältst 2 % von jedem Einsatz deiner geworbenen Freunde",
          rule3: "Auszahlungen erfolgen sofort – so schnell wie eine KAS-Transaktion",
          rule4: "Benutzerdefinierte Empfehlungslinks für KOLs verfügbar"
        },
        hint: "Um deine Empfehlungsseite zu öffnen, klicke nach dem Einloggen auf deinen Namen oder KAS-Saldo in der Navigationsleiste."
      },
      finalCTA: {
        title: "Bereit zu spielen?",
        description: "Schließe dich anderen Kasino-Spielern an, die die spannenden Spiele und Belohnungssysteme genießen!",
        button: "Jetzt ins Kasino einsteigen"
      },
      games: {
        ghostJump: {
          title: "Geistersprung",
          description: "Erlebe den Nervenkitzel, die Schwerkraft in Ghost Jump herauszufordern! Setze deinen KAS und klicke auf die verzauberte, schwebende Kachel, um höher zu steigen – je höher du stehst, desto größer die Belohnungen und das Herzklopfen. Aber bedenke, jeder Sprung birgt ein gewagtes Risiko!"
        },
        kaspianCross: {
          title: "Kaspian Cross",
          description: "Stelle dich deinem Schicksal in Kaspian Cross! Setze und trete auf die nächste Kachel – jeder Schritt bietet die Chance auf enorme Gewinne, während das Risiko eines Zusammenstoßes mit einem schnellen Solana-Fahrzeug steigt. Bist du mutig genug?"
        },
        crash: {
          title: "Crash",
          description: "Spüre den Adrenalinschub bei Crash! Setze und sieh zu, wie dein Multiplikator rasch steigt – kassiere rechtzeitig, bevor der unvermeidliche Crash eintritt, oder riskiere alles für einen noch größeren Gewinn!"
        },
        mines: {
          title: "Minen",
          description: "Entdecke verborgene Schätze in Mines! Klicke, um sichere Kacheln und Multiplikatoren freizulegen – ein falscher Schritt und dein Einsatz ist verloren. Vertraue deinem Instinkt und spiele klug!"
        },
        upgrade: {
          title: "Aufrüstung",
          description: "Bereit für einen Boost? Wähle deinen gewünschten Multiplikator, setze deinen Einsatz und beobachte den Countdown – ein episches Upgrade oder ein gewagter Verlust erwartet dich. Es geht um den Nervenkitzel des Risikos!"
        },
        kaspaTowerClimb: {
          title: "Kaspa Tower Climb",
          description: "Steige auf in Kaspa Tower Climb! Setze und wähle eine Kachel – wenn sicher, erscheint das ikonische Kaspa-Logo; andernfalls ein X. Du kannst nach dem ersten Schritt jederzeit aussteigen, um deine Gewinne zu sichern!"
        },
        guessTheCup: {
          title: "Rate den Becher",
          description: "Teste dein Glück bei 'Rate den Becher'! Setze und entscheide, unter welchem Becher der geheime Preis liegt – eine falsche Wahl und das Spiel endet, aber bei richtigem Tipp wartet ein spektakulärer Gewinn!"
        },
        plinko: {
          title: "Plinko",
          description: "Erlebe die Unvorhersehbarkeit von Plinko! Setze und beobachte, wie der Ball abprallt und in einem zufälligen Multiplikator endet – simpel, spannend und stets überraschend."
        },
        roulette: {
          title: "Roulette",
          description: "Wähle deine Farbe oder Zahlenfolge in Roulette! Setze und lass das Rad drehen, um dein Schicksal zu bestimmen. Klassischer Nervenkitzel und Spannung pur!"
        },
        dice: {
          title: "Würfel",
          description: "Wirf die Würfel des Schicksals in Dice! Wähle deinen Multiplikator, setze deinen Einsatz und vertraue dem Zufall – kannst du die Hausbank schlagen, wenn die Einsätze steigen?"
        },
        coinFlip: {
          title: "Münzwurf",
          description: "Wirf die Münze des Glücks! Setze deinen Einsatz, wähle das Symbol und vertraue dem Wurf – höhere Multiplikatoren steigern den Nervenkitzel und das Risiko."
        },
        kasperLootBox: {
          title: "Kasper Loot Box",
          description: "Entdecke Überraschungen in der Kasper Loot Box! Setze 25 KAS und lass die Animation drehen, um dein Glück zu enthüllen – gewinnst du groß oder sicherst dir einen kleinen Gewinn? Jeder Dreh ist ein faszinierendes Geheimnis!"
        },
        kasenMania: {
          title: "Kasen Mania",
          description: "Tauche ein in Kasen Mania, unser elektrisierendes Slot-Abenteuer! Setze und beobachte, wie die Walzen in Erwartung drehen – gleiche die Symbole ab und erhalte epische Boni, von kleinen Gewinnen bis zu massiven Multiplikatoren."
        }
      }
    }
  },
  zh: {
    translation: {
      guideTitle: "Kasino 指南",
      guideSubtitle: "了解在 Kasino 玩、赚和赢的一切信息！",
      backToCasino: "返回 Kasino",
      gamesSection: {
        title: "游戏"
      },
      xpSection: {
        title: "经验值与等级系统",
        earnXP: {
          title: "每次下注获取经验值",
          description: "你下注的每个 KAS 都会为你赚取 1 经验值。当你累计足够经验值后，你就能升级并解锁惊人的奖励！",
          rule1: "1 KAS 下注 = 1 经验值",
          rule2: "更高的等级解锁更好的奖励",
          rule3: "在导航栏中查看你的等级"
        },
        dailyLoot: {
          title: "每日战利品箱",
          description: "随着等级提升，你将解锁每日免费战利品箱，每 24 小时可开启一次。",
          level: "等级",
          alt: "等级",
          box: "战利品箱",
          hint: "点击导航栏中的等级图标以打开每日战利品箱菜单。"
        }
      },
      gemSection: {
        title: "宝石系统",
        earnGems: {
          title: "玩游戏赚宝石",
          description: "每次下注都有机会获得宝石，可用于打开装满 KAS 奖励的宝石箱。",
          rule1: "每次下注都有机会随机赚取宝石",
          rule2: "下注越多 = 获得宝石的机会越多",
          rule3: "更高的宝石等级提供更好的奖励"
        },
        crates: {
          title: "宝石箱",
          description: "共有 4 个等级的宝石箱，每个需要不同数量的宝石才能开启。",
          tier: "等级",
          alt: "宝石箱等级",
          required: "需要宝石",
          hint: "点击导航栏中的宝石显示以打开宝石箱菜单。"
        }
      },
      referralSection: {
        title: "推荐系统",
        earn: {
          title: "与朋友一起赚钱",
          description: "我们的推荐系统奖励你邀请朋友加入 Kasino。你和你的朋友都能获得奖金！",
          rule1: "新玩家通过你的推荐注册时获得 100 经验值",
          rule2: "你将获得推荐好友每次下注的 2%",
          rule3: "支付即刻到帐——快如 KAS 交易",
          rule4: "意见领袖可获得定制推荐链接"
        },
        hint: "登录后点击导航栏中的你的姓名或 KAS 余额即可访问推荐页面。"
      },
      finalCTA: {
        title: "准备好玩吗？",
        description: "加入众多 Kasino 玩家，一起享受刺激的游戏和奖励系统！",
        button: "立即进入 Kasino"
      },
      games: {
        ghostJump: {
          title: "幽灵跳跃",
          description: "体验挑战重力的快感！下注后点击魔幻浮动图块，让自己飞得更高——飞得越高，奖励越丰厚，但每次跃升都伴随着大胆的风险！"
        },
        kaspianCross: {
          title: "Kaspian Cross",
          description: "在 Kaspian Cross 中挑战命运！下注后迈出下一步——每一步都有机会赢得巨额奖励，但被 Solana 车撞击的风险也会增加。你敢挑战吗？"
        },
        crash: {
          title: "Crash",
          description: "感受 Crash 带来的肾上腺素飙升！下注后观察你的乘数极速上升——赶在必然崩盘前兑现收益，或冒险全押以争取更大胜利！"
        },
        mines: {
          title: "地雷游戏",
          description: "在地雷游戏中寻找隐藏的财富！点击揭开安全区域和乘数——一旦踩到雷，你将失去下注金额。相信直觉，小心行事！"
        },
        upgrade: {
          title: "升级游戏",
          description: "想要提升吗？选择你期望的乘数，下注并等待倒计时——你可能获得史诗般的升级，也可能面临大胆的失利。刺激的博弈尽在其中！"
        },
        kaspaTowerClimb: {
          title: "Kaspa 塔攀登",
          description: "在 Kaspa 塔攀登中挑战高度！下注后选择一块图块——若安全则显示 Kaspa 徽标，否则显示 X。第一步后你可随时兑现收益！"
        },
        guessTheCup: {
          title: "猜杯子游戏",
          description: "测试你的运气！下注后选出哪个杯子下藏有奖励——猜错即输，猜对则获得丰厚奖励！"
        },
        plinko: {
          title: "Plinko",
          description: "享受 Plinko 那不可预测的乐趣！下注后观看球体碰撞并落至随机乘数处——简单、刺激，每次下落都充满惊喜！"
        },
        roulette: {
          title: "轮盘赌",
          description: "选择颜色或数字序列下注，让转盘决定你的命运。经典游戏中充满悬念与刺激！"
        },
        dice: {
          title: "骰子游戏",
          description: "选择乘数、下注并掷出骰子——在不断升高的赌注中，你能否战胜赌场？"
        },
        coinFlip: {
          title: "抛硬币",
          description: "设置赌注、选择图案并抛出硬币——更高的乘数意味着更多刺激与风险，命运握在你手中！"
        },
        kasperLootBox: {
          title: "Kasper 战利品箱",
          description: "下注 25 KAS，旋转转盘揭开惊喜——你可能获得大奖或小奖，每次旋转都是一段神秘体验！"
        },
        kasenMania: {
          title: "Kasen 狂热",
          description: "投入我们的首款老虎机游戏 Kasen 狂热！下注后看转轮旋转——中排连续相同获得 1.1 倍、斜向排列 2 倍、上排排列 3 倍，奖金多多！"
        }
      }
    }
  },
  ja: {
    translation: {
      guideTitle: "カシノガイド",
      guideSubtitle: "カシノで遊び、稼ぎ、勝つために知っておくべきすべての情報！",
      backToCasino: "カジノへ戻る",
      gamesSection: {
        title: "ゲーム"
      },
      xpSection: {
        title: "XP & レベルシステム",
        earnXP: {
          title: "賭けるたびにXPを獲得",
          description: "あなたが賭けた1 KASにつき1 XPが得られます。XPを積み上げるとレベルアップし、素晴らしい報酬がアンロックされます！",
          rule1: "1 KAS賭ける = 1 XP",
          rule2: "高いレベルはより良い報酬をアンロック",
          rule3: "ナビゲーションバーで自分のレベルを確認"
        },
        dailyLoot: {
          title: "デイリールートボックス",
          description: "レベルアップに伴い、24時間に1回、無料でルートボックスを開ける権利が得られます。",
          level: "レベル",
          alt: "レベル",
          box: "ルートボックス",
          hint: "ナビゲーションバーのレベルアイコンをクリックして、デイリールートボックスメニューを開いてください。"
        }
      },
      gemSection: {
        title: "ジェムシステム",
        earnGems: {
          title: "遊びながらジェムを獲得",
          description: "賭けるたびにジェムを獲得するチャンスがあり、そのジェムはKAS報酬が詰まったジェムボックスを開くために使用されます。",
          rule1: "賭けるたびにランダムでジェムを獲得",
          rule2: "賭けが多いほどジェム獲得の機会が増える",
          rule3: "高いジェムレベルはより良い報酬を提供"
        },
        crates: {
          title: "ジェムボックス",
          description: "4段階のジェムボックスがあり、それぞれ異なる数量のジェムが必要です。",
          tier: "段階",
          alt: "ジェムボックス段階",
          required: "必要なジェム",
          hint: "ナビゲーションバーのジェム表示をクリックして、ジェムボックスメニューを開いてください。"
        }
      },
      referralSection: {
        title: "紹介システム",
        earn: {
          title: "友達と一緒に稼ぐ",
          description: "紹介システムは、友達をカシノに招待することであなたに報酬を与えます。あなたも友達もボーナスをゲット！",
          rule1: "新規プレイヤーはあなたの紹介で登録すると100 XPを獲得",
          rule2: "あなたは紹介した友達の賭けの2%を獲得",
          rule3: "支払いは即時 — KASトランザクションのように速い",
          rule4: "KOL向けのカスタム紹介リンクも利用可能"
        },
        hint: "ログイン後、ナビゲーションバーの自分の名前またはKAS残高をクリックして、紹介ページにアクセスしてください。"
      },
      finalCTA: {
        title: "さあ、遊びましょう！",
        description: "カシノのエキサイティングなゲームと報酬システムを楽しむ仲間に参加しましょう！",
        button: "今すぐカシノに入る"
      },
      games: {
        ghostJump: {
          title: "ゴーストジャンプ",
          description: "ゴーストジャンプで重力に挑戦するスリルを体験せよ！賭けて魔法の浮遊タイルをクリックし、より高く舞い上がろう—高く昇れば昇るほど、報酬は大きく、心躍る興奮も増す。しかし、すべてのジャンプには大胆なリスクが伴います！"
        },
        kaspianCross: {
          title: "Kaspian Cross",
          description: "Kaspian Crossで運命に挑め！賭けて次のタイルを踏み出せ—一歩ごとに大きな報酬のチャンスがあるが、同時に素早いSolana車に轢かれるリスクも増します。あなたはその勇気がありますか？"
        },
        crash: {
          title: "クラッシュ",
          description: "クラッシュでアドレナリンが爆発する瞬間を感じてください！賭けて乗数が急上昇する様子を見守り、必然のクラッシュが来る前に早めにキャッシュアウトするか、さらなる大勝利のために全てを賭けましょう！"
        },
        mines: {
          title: "マインズ",
          description: "マインズで隠された財宝を見つけ出しましょう！安全なタイルと乗数をクリックで明らかにします—一歩間違えば賭け金は消え、直感を信じて賢くプレイしてください！"
        },
        upgrade: {
          title: "アップグレード",
          description: "パワーアップの準備はできましたか？欲しい乗数を選び、賭け、カウントダウンを見守りましょう—壮大なアップグレードか、大胆な負けが待っています！"
        },
        kaspaTowerClimb: {
          title: "Kaspa Tower Climb",
          description: "Kaspa Tower Climbで高みを目指しましょう！賭けてタイルを選び、安全ならKaspaのロゴが、失敗ならXが表示されます。最初のタイル以降はいつでもキャッシュアウト可能です！"
        },
        guessTheCup: {
          title: "カップ当てゲーム",
          description: "カップ当てゲームで運を試しましょう！賭けてどのカップの下に賞品が隠されているかを予想します—間違えば全てを失い、正解すれば大当たりを手にします！"
        },
        plinko: {
          title: "Plinko",
          description: "Plinkoの予測不可能な興奮をお楽しみください！賭けてボールが跳ね返り、ランダムな乗数に落ちる様子を見守ります—シンプルながら刺激的で、毎回驚きに満ちています！"
        },
        roulette: {
          title: "ルーレット",
          description: "ルーレットで好きな色または数字の列を選び賭けましょう。ホイールの回転があなたの運命を決定します—サスペンスと興奮が融合するクラシックなゲームです！"
        },
        dice: {
          title: "サイコロゲーム",
          description: "サイコロゲームで運に挑戦しましょう！乗数を選び、賭け、サイコロを転がします—賭けが大きくなるほど、あなたの運が試されます！"
        },
        coinFlip: {
          title: "コインフリップ",
          description: "幸運のコインを投げましょう！賭け金を設定し、シンボルを選び、硬貨を投げます—高い乗数は興奮とリスクを増大させ、あなたの手の中に運命が委ねられます！"
        },
        kasperLootBox: {
          title: "Kasper Loot Box",
          description: "Kasper Loot Boxで驚きを解き放ちましょう！25 KASを賭け、回転するアニメーションで戦利品を明らかにします—大勝ちするか小勝ちするか、毎回が神秘的な体験です！"
        },
        kasenMania: {
          title: "Kasen Mania",
          description: "初のスロットゲーム、Kasen Maniaに挑戦しましょう！賭けてリールの回転を見守り、シンボルが揃えば1.1倍、斜めなら2倍、上段なら3倍の勝利が待っています！"
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // React already safeguards from XSS
    }
  });

export default i18n;
