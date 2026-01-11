'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneMissed,
  Mic,
  MicOff,
  Pause,
  Play,
  PhoneForwarded,
  Volume2,
  VolumeX,
  Circle,
} from 'lucide-react';

export type CallStatus = 'idle' | 'ringing' | 'connected' | 'on-hold';

interface SoftphoneProps {
  onAnswer?: () => void;
  onHangup?: () => void;
  onHold?: () => void;
  onMute?: () => void;
  onTransfer?: () => void;
  onDial?: (number: string) => void;
}

export function Softphone({
  onAnswer,
  onHangup,
  onHold,
  onMute,
  onTransfer,
  onDial,
}: SoftphoneProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(80);
  const [dialedNumber, setDialedNumber] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [callerInfo, setCallerInfo] = useState({
    name: 'John Smith',
    number: '+1 (555) 123-4567',
    location: 'New York, NY',
  });

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected' && !isOnHold) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus, isOnHold]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDialPad = (digit: string) => {
    setDialedNumber((prev) => prev + digit);
  };

  const handleClear = () => {
    setDialedNumber('');
  };

  const handleDial = () => {
    if (dialedNumber) {
      onDial?.(dialedNumber);
      setCallStatus('ringing');
      // Simulate call connection
      setTimeout(() => {
        setCallStatus('connected');
        setIsRecording(true);
      }, 2000);
    }
  };

  const handleAnswer = () => {
    onAnswer?.();
    setCallStatus('connected');
    setIsRecording(true);
    setCallDuration(0);
  };

  const handleHangup = () => {
    onHangup?.();
    setCallStatus('idle');
    setIsRecording(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsOnHold(false);
    setDialedNumber('');
  };

  const handleHold = () => {
    onHold?.();
    setIsOnHold(!isOnHold);
  };

  const handleMute = () => {
    onMute?.();
    setIsMuted(!isMuted);
  };

  const handleTransfer = () => {
    onTransfer?.();
  };

  const getStatusBadge = () => {
    switch (callStatus) {
      case 'idle':
        return (
          <Badge variant="outline" className="gap-1">
            <Circle className="h-2 w-2 fill-gray-500 text-gray-500" />
            Idle
          </Badge>
        );
      case 'ringing':
        return (
          <Badge variant="outline" className="gap-1">
            <Circle className="h-2 w-2 fill-yellow-500 text-yellow-500 animate-pulse" />
            Ringing
          </Badge>
        );
      case 'connected':
        return (
          <Badge variant="outline" className="gap-1">
            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
            {isOnHold ? 'On Hold' : 'Connected'}
          </Badge>
        );
      case 'on-hold':
        return (
          <Badge variant="outline" className="gap-1">
            <Circle className="h-2 w-2 fill-orange-500 text-orange-500" />
            On Hold
          </Badge>
        );
    }
  };

  const dialPadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  // Simulate incoming call for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (callStatus === 'idle') {
        setCallStatus('ringing');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Softphone</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Call Display */}
        <div className="bg-muted/50 rounded-lg p-4 min-h-[120px] flex flex-col items-center justify-center">
          {callStatus === 'idle' ? (
            <div className="text-center">
              <Phone className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Ready for calls</p>
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                {callStatus === 'ringing' && (
                  <PhoneIncoming className="h-8 w-8 text-green-500 animate-bounce" />
                )}
                {isRecording && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Circle className="h-2 w-2 fill-red-500 text-red-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Recording</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">{callerInfo.name}</h3>
                <p className="text-sm text-muted-foreground">{callerInfo.number}</p>
                <p className="text-xs text-muted-foreground">{callerInfo.location}</p>
                {callStatus === 'connected' && (
                  <div className="mt-2">
                    <p className="text-2xl font-mono font-bold">
                      {formatDuration(callDuration)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Call Controls */}
        {callStatus !== 'idle' && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={isMuted ? 'destructive' : 'outline'}
              size="sm"
              onClick={handleMute}
              className="flex flex-col gap-1 h-auto py-3"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              <span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
            </Button>
            <Button
              variant={isOnHold ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleHold}
              className="flex flex-col gap-1 h-auto py-3"
              disabled={callStatus !== 'connected'}
            >
              {isOnHold ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              <span className="text-xs">{isOnHold ? 'Resume' : 'Hold'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTransfer}
              className="flex flex-col gap-1 h-auto py-3"
              disabled={callStatus !== 'connected'}
            >
              <PhoneForwarded className="h-5 w-5" />
              <span className="text-xs">Transfer</span>
            </Button>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="flex gap-2">
          {callStatus === 'ringing' && (
            <>
              <Button
                onClick={handleAnswer}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <PhoneIncoming className="h-5 w-5 mr-2" />
                Answer
              </Button>
              <Button
                onClick={handleHangup}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <PhoneMissed className="h-5 w-5 mr-2" />
                Reject
              </Button>
            </>
          )}
          {callStatus === 'connected' && (
            <Button
              onClick={handleHangup}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Hang Up
            </Button>
          )}
        </div>

        <Separator />

        {/* Dial Pad */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={dialedNumber}
              onChange={(e) => setDialedNumber(e.target.value)}
              placeholder="Enter number..."
              className="flex-1 px-3 py-2 text-center text-lg font-mono border rounded-md bg-background"
              disabled={callStatus !== 'idle'}
            />
            {dialedNumber && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleClear}
                disabled={callStatus !== 'idle'}
              >
                ×
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {dialPadNumbers.map((row, rowIndex) =>
              row.map((digit) => (
                <Button
                  key={`${rowIndex}-${digit}`}
                  variant="outline"
                  size="lg"
                  onClick={() => handleDialPad(digit)}
                  className="text-lg font-semibold h-14"
                  disabled={callStatus !== 'idle' && callStatus !== 'connected'}
                >
                  {digit}
                </Button>
              ))
            )}
          </div>

          {callStatus === 'idle' && (
            <Button
              onClick={handleDial}
              disabled={!dialedNumber}
              className="w-full"
              size="lg"
            >
              <Phone className="h-5 w-5 mr-2" />
              Dial
            </Button>
          )}
        </div>

        <Separator />

        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {volume > 0 ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">Volume</span>
            </div>
            <span className="text-sm font-medium">{volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </CardContent>
    </Card>
  );
}
