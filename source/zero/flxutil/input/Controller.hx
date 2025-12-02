package zero.flxutil.input;

import flixel.FlxG;
import flixel.input.keyboard.FlxKey;

/**
 * Shadow Controller class to replace broken zerolib 0.4.0 version.
 * Implements legacy API expected by Centras Insurance Game.
 */
class Controller extends flixel.FlxBasic
{
	public static inline var A = 0;
	public static inline var B = 1;
	public static inline var X = 2;
	public static inline var Y = 3;
	public static inline var UP = 4;
	public static inline var DOWN = 5;
	public static inline var LEFT = 6;
	public static inline var RIGHT = 7;

	public var dpad:DpadConfig;
	public var face:FaceConfig;

	public var state(get, never):ControllerState;

	public function new(options:Int = 0)
	{
		super();
		dpad = new DpadConfig();
		face = new FaceConfig();

		dpad.LEFT = [FlxKey.LEFT, FlxKey.A];
		dpad.RIGHT = [FlxKey.RIGHT, FlxKey.D];
		dpad.UP = [FlxKey.UP, FlxKey.W];
		dpad.DOWN = [FlxKey.DOWN, FlxKey.S];

		face.A = [FlxKey.SPACE, FlxKey.Z, FlxKey.ENTER];
		face.B = [FlxKey.X, FlxKey.ESCAPE];
		face.X = [FlxKey.C];
		face.Y = [FlxKey.V];
	}

	public function pressed(btn:Int):Bool
	{
		var keys:Array<FlxKey> = getKeys(btn);
		return checkKeys(keys, flixel.input.FlxInputState.PRESSED);
	}

	public function just_pressed(btn:Int):Bool
	{
		var keys:Array<FlxKey> = getKeys(btn);
		return checkKeys(keys, flixel.input.FlxInputState.JUST_PRESSED);
	}

	function getKeys(btn:Int):Array<FlxKey> {
		switch(btn) {
			case LEFT: return dpad.LEFT;
			case RIGHT: return dpad.RIGHT;
			case UP: return dpad.UP;
			case DOWN: return dpad.DOWN;
			case A: return face.A;
			case B: return face.B;
			case X: return face.X;
			case Y: return face.Y;
		}
		return [];
	}

	function checkKeys(keys:Array<FlxKey>, status:flixel.input.FlxInputState):Bool
	{
		if (keys == null) return false;
		for (k in keys) if (FlxG.keys.checkStatus(k, status)) return true;
		return false;
	}

	function get_state():ControllerState
	{
		return new ControllerState(this);
	}

	public function add() {
		FlxG.state.add(this);
	}
}

class DpadConfig {
	public var UP:Array<FlxKey> = [];
	public var DOWN:Array<FlxKey> = [];
	public var LEFT:Array<FlxKey> = [];
	public var RIGHT:Array<FlxKey> = [];
	public function new() {}
}

class FaceConfig {
	public var A:Array<FlxKey> = [];
	public var B:Array<FlxKey> = [];
	public var X:Array<FlxKey> = [];
	public var Y:Array<FlxKey> = [];
	public function new() {}
}

class ControllerState {
	var c:Controller;
	public var face(get, never):FaceState;
	public var dpad(get, never):DpadState;
	public function new(c:Controller) this.c = c;
	function get_face() return new FaceState(c);
	function get_dpad() return new DpadState(c);
}

class FaceState {
	var c:Controller;
	public var a(get, never):Bool;
	public var b(get, never):Bool;
	public var x(get, never):Bool;
	public var y(get, never):Bool;

	public var a_p(get, never):Bool;
	public var b_p(get, never):Bool;
	public var x_p(get, never):Bool;
	public var y_p(get, never):Bool;

	public function new(c:Controller) this.c = c;

	function get_a() return c.pressed(Controller.A);
	function get_b() return c.pressed(Controller.B);
	function get_x() return c.pressed(Controller.X);
	function get_y() return c.pressed(Controller.Y);

	function get_a_p() return c.just_pressed(Controller.A);
	function get_b_p() return c.just_pressed(Controller.B);
	function get_x_p() return c.just_pressed(Controller.X);
	function get_y_p() return c.just_pressed(Controller.Y);
}

class DpadState {
	var c:Controller;
	public var u(get, never):Bool;
	public var d(get, never):Bool;
	public var l(get, never):Bool;
	public var r(get, never):Bool;

	public var u_p(get, never):Bool;
	public var d_p(get, never):Bool;
	public var l_p(get, never):Bool;
	public var r_p(get, never):Bool;

	public function new(c:Controller) this.c = c;

	function get_u() return c.pressed(Controller.UP);
	function get_d() return c.pressed(Controller.DOWN);
	function get_l() return c.pressed(Controller.LEFT);
	function get_r() return c.pressed(Controller.RIGHT);

	function get_u_p() return c.just_pressed(Controller.UP);
	function get_d_p() return c.just_pressed(Controller.DOWN);
	function get_l_p() return c.just_pressed(Controller.LEFT);
	function get_r_p() return c.just_pressed(Controller.RIGHT);
}
