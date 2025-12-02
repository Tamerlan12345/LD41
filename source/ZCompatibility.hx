package;

import zero.flxutil.input.Controller;
import zero.flxutil.input.PlayerController;
import zero.flxutil.states.State;
import zero.flxutil.sprites.ParticleEmitter;

// Create typedefs to map old names to new names in zerolib 0.4.0
typedef ZBaseController = Controller;
typedef ZPlayerController = PlayerController;
typedef ZState = State;
typedef ZParticleGroup = ParticleEmitter;
// Access Particle class which is defined inside the ParticleEmitter module
typedef ZParticle = zero.flxutil.sprites.ParticleEmitter.Particle;
