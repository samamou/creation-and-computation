/*

BOX

Builds on twoSensorFourChannels.ino, twoSensorMap, and twoSensorThresholdTime.ino from the examples provided by Kate and Nick

Each sensor sets the brightness of its MOSFET channel using map().
LED 1 and LED 2 are MOSFET drivers with many LEDs.
LED 3 and LED 4 are LEDs connected directly to a pin (max 3 per pin).

(same setup as example)
Pin A1 : Sensor 1  ->  Pin 12 : LED 1 (MOSFET 1)
                   ->  Pin 33 : LED 3 (LEDs on the pin)
Pin A2 : Sensor 2  ->  Pin 27 : LED 2 (MOSFET 2)
                   ->  Pin 15 : LED 4 (LEDs on the pin)
*/

//Sensor variables
int sensor1Pin = A1;
int sensor1Value; //the raw reading
int sensor1Constrained; //the reading kept inside its range

int sensor2Pin = A2;
int sensor2Value;
int sensor2Constrained;

//The range each sensor actually gives you (0 - 4095)
int sensor1Min = 0;
int sensor1Max = 4095;

int sensor2Min = 0;
int sensor2Max = 4095;

//The value that starts the pulse (0 - 4095)
int sensor1Threshold = 500;
int sensor2Threshold = 1500;

//LED variables
int led1Pin = 12; //MOSFET 1
int led1Value;

int led2Pin = 27; //MOSFET 2
int led2Value;

int led3Pin = 33; //LEDs connected directly to the pin
int led3Value;

int led4Pin = 15; //LEDs connected directly to the pin
int led4Value;

//The brightness range for each channel (0 - 255)
int led1Min = 0;
int led1Max = 255;

int led2Min = 0;
int led2Max = 255;

//LED 3 and LED 4 are inverted: the Min is higher than the Max
int led3Min = 255;
int led3Max = 0;

int led4Min = 255;
int led4Max = 0;

int ambientPulseTime = 2000;
int ambientSteady = 60;

int showPulseTime = 200;
int showFastTime = 3000;
int showBrightTime = 5000;
int showDarkTime = 20000;

unsigned long showStartTime = 0;
unsigned long showElapsed = 0;
bool showRunning = false;
bool showDone = false;

void setup()
{
  Serial.begin(9600);

  pinMode(led1Pin, OUTPUT);
  pinMode(led2Pin, OUTPUT);
  pinMode(led3Pin, OUTPUT);
  pinMode(led4Pin, OUTPUT);
}

void loop()
{
  //read both sensors (0 - 4095)
  sensor1Value = analogRead(sensor1Pin);
  sensor2Value = analogRead(sensor2Pin);

  //sensor values can jump outside the range, so keep them inside it first
  sensor1Constrained = constrain(sensor1Value, sensor1Min, sensor1Max);
  sensor2Constrained = constrain(sensor2Value, sensor2Min, sensor2Max);

  //if both sensors are above their thresholds, start the show
  if (showRunning == false && showDone == false && sensor1Value > sensor1Threshold && sensor2Value > sensor2Threshold)
  {
    showRunning = true;
    showStartTime = millis();
  }

  //if the show is running, calculate the elapsed time and set the LED values accordingly
  if (showRunning == true)
  {
    showElapsed = millis() - showStartTime;

    if (showElapsed < showFastTime)
    {
      led1Value = oscillate(led1Min, led1Max, showPulseTime);
      led2Value = oscillate(led2Max, led2Min, showPulseTime);
      led3Value = oscillate(led3Min, led3Max, showPulseTime);
      led4Value = oscillate(led4Max, led4Min, showPulseTime);
    }
    else if (showElapsed < showBrightTime)
    {
      led1Value = led1Max;
      led2Value = led2Max;
      led3Value = 255;
      led4Value = 255;
    }
    else if (showElapsed < showDarkTime)
    {
      led1Value = 0;
      led2Value = 0;
      led3Value = 0;
      led4Value = 0;
    }
    else
    {
      showRunning = false;
      showDone = true;
    }
  }
  //if the show is not running, set the LED values based on the sensor readings
  else
  {
    if (sensor1Value < sensor1Threshold && sensor2Value < sensor2Threshold)
    {
      showDone = false;
      led3Value = oscillate(led3Min, led3Max, ambientPulseTime);
      led4Value = oscillate(led4Max, led4Min, ambientPulseTime);
    }
    else
    {
      led3Value = ambientSteady;
      led4Value = ambientSteady;
    }

    //Sensor 1 sets LED 1
    led1Value = map(sensor1Constrained, sensor1Min, sensor1Max, led1Min, led1Max);

    //Sensor 2 sets LED 2
    led2Value = map(sensor2Constrained, sensor2Min, sensor2Max, led2Min, led2Max);
  }

  //set 4 channels
  analogWrite(led1Pin, led1Value);
  analogWrite(led2Pin, led2Value);
  analogWrite(led3Pin, led3Value);
  analogWrite(led4Pin, led4Value);

  //print the sensor and LED values on one line
  Serial.print("Sensor 1: ");
  Serial.print(sensor1Value);
  Serial.print("   LED 1: ");
  Serial.print(led1Value);
  Serial.print("   LED 3: ");
  Serial.print(led3Value);
  Serial.print("   Sensor 2: ");
  Serial.print(sensor2Value);
  Serial.print("   LED 2: ");
  Serial.print(led2Value);
  Serial.print("   LED 4: ");
  Serial.print(led4Value);
  Serial.print("   Show: ");
  Serial.println(showRunning);
}

int oscillate(int minVal, int maxVal, int oscillationTime)
{
    // Calculate an oscillating value from 0.0 to 1.0 and back, once every oscillationTime milliseconds
    // -cos() starts at the bottom of the wave, so the fade begins at minVal and rises first
    float wave = 0.5 + (0.5 * -cos((millis() * TWO_PI) / (float)oscillationTime));

    // Scale the wave (0.0 to 1.0) to the desired range (minVal to maxVal)
    int brightness = minVal + (wave * (maxVal - minVal));

    return brightness;
}