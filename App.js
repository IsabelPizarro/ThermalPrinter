import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Platform,
  Button,
  DeviceEventEmitter,
  NativeEventEmitter,
  Switch,
  TouchableOpacity,
  Dimensions,
  Alert,
  ToastAndroid,
} from 'react-native';
import {
  BluetoothManager,
  BluetoothEscposPrinter,
  BluetoothTscPrinter,
} from 'react-native-bluetooth-escpos-printer';

export default class App extends React.Component {
  _listeners = [];
  constructor(props) {
    super(props);
    this.state = {
      devices: null,
      pairedDs: [],
      foundDs: [],
      bleOpend: false,
      loading: true,
      boundAddress: '',
      name: '',
      iscon: 0,
      debugMsg: '',
    };
  }
  componentDidMount() {
    console.log('hola');
    BluetoothManager.isBluetoothEnabled().then(
      (enabled) => {
        console.log(enabled);
      },
      (err) => {
        console.log(err);
      },
    );
    if (Platform.OS === 'ios') {
      let bluetoothManagerEmitter = new NativeEventEmitter(BluetoothManager);
      this._listeners.push(
        bluetoothManagerEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
          (rsp) => {
            this._deviceAlreadPaired(rsp);
          },
        ),
      );
      this._listeners.push(
        bluetoothManagerEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_FOUND,
          (rsp) => {
            this._deviceFoundEvent(rsp);
          },
        ),
      );
      this._listeners.push(
        bluetoothManagerEmitter.addListener(
          BluetoothManager.EVENT_CONNECTION_LOST,
          () => {
            this.setState({
              name: '',
              boundAddress: '',
            });
          },
        ),
      );
    } else if (Platform.OS === 'android') {
      this._listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
          (rsp) => {
            this._deviceAlreadPaired(rsp);
          },
        ),
      );
      this._listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_DEVICE_FOUND,
          (rsp) => {
            this._deviceFoundEvent(rsp);
          },
        ),
      );
      this._listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_CONNECTION_LOST,
          () => {
            this.setState({
              name: '',
              boundAddress: '',
            });
          },
        ),
      );
      this._listeners.push(
        DeviceEventEmitter.addListener(
          BluetoothManager.EVENT_BLUETOOTH_NOT_SUPPORT,
          () => {
            ToastAndroid.show(
              'Device Not Support Bluetooth !',
              ToastAndroid.LONG,
            );
          },
        ),
      );
    }
    // this._getData();
  }
  componentWillUnmount() {
    for (let ls in this._listeners) {
      this._listeners[ls].remove();
    }
  }
  _deviceAlreadPaired(rsp) {
    var ds = null;
    if (typeof rsp.devices === 'object') {
      ds = rsp.devices;
    } else {
      try {
        ds = JSON.parse(rsp.devices);
      } catch (e) {}
    }
    if (ds && ds.length) {
      let pared = this.state.pairedDs;
      pared = pared.concat(ds || []);
      this.setState({
        pairedDs: pared,
      });
    }
  }
  _deviceFoundEvent(rsp) {
    //alert(JSON.stringify(rsp))
    var r = null;
    try {
      if (typeof rsp.device === 'object') {
        r = rsp.device;
      } else {
        r = JSON.parse(rsp.device);
      }
    } catch (e) {
      Alert.alert(e.message);
      //ignore
    }
    //alert('f')
    if (r) {
      let found = this.state.foundDs || [];
      if (found.findIndex) {
        let duplicated = found.findIndex(function (x) {
          return x.address == r.address;
        });
        //CHECK DEPLICATED HERE...
        if (duplicated == -1) {
          found.push(r);
          this.setState({
            foundDs: found,
          });
        }
      }
    }
  }

  _renderRow(rows) {
    let items = [];
    for (let i in rows) {
      let row = rows[i];
      if (row.address) {
        items.push(
          <TouchableOpacity
            key={new Date().getTime() + i}
            style={styles.wtf}
            onPress={() => {
              console.log('prss dispositivo x');
              console.log(row.name);
              this.setState({
                loading: true,
              });
              BluetoothManager.connect(row.address).then(
                (s) => {
                  console.log(s);
                  console.log('conetado');
                  this.setState({
                    loading: false,
                    boundAddress: row.address,
                    name: row.name || 'UNKNOWN',
                  });
                },
                (e) => {
                  console.log(e.message);
                  this.setState({
                    loading: false,
                  });
                  Alert.alert(e.message);
                },
              );
            }}>
            <Text style={styles.name}>{row.name || 'UNKNOWN'}</Text>
            <Text style={styles.address}>-{row.address}</Text>
          </TouchableOpacity>,
        );
      }
    }
    return items;
  }

  render() {
    return (
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.body}>
            <Text style={styles.sectionTitle}>Thermal Printer</Text>

            <Text>{this.state.debugMsg}</Text>
            <Text style={styles.title}>
              <Text>
                Blutooth Activado:{this.state.bleOpend ? 'true' : 'false'}{' '}
              </Text>
              <Text>Activa el Blutooth para buscar dispositivoa</Text>{' '}
            </Text>
            <View style={styles.switchContainer}>
              <Switch
                value={this.state.bleOpend}
                onValueChange={(v) => {
                  this.setState({
                    loading: true,
                  });
                  if (!v) {
                    BluetoothManager.disableBluetooth().then(
                      () => {
                        this.setState({
                          bleOpend: false,
                          loading: false,
                          foundDs: [],
                          pairedDs: [],
                        });
                      },
                      (err) => {
                        Alert.alert(err);
                      },
                    );
                  } else {
                    BluetoothManager.enableBluetooth().then(
                      (r) => {
                        var paired = [];
                        if (r && r.length > 0) {
                          for (var i = 0; i < r.length; i++) {
                            try {
                              paired.push(JSON.parse(r[i]));
                            } catch (e) {
                              //ignore
                            }
                          }
                        }
                        this.setState({
                          bleOpend: true,
                          loading: false,
                          pairedDs: paired,
                        });
                      },
                      (err) => {
                        this.setState({
                          loading: false,
                        });
                        Alert.alert(err);
                      },
                    );
                  }
                }}
              />
              <Button
                style={styles.btn}
                disabled={this.state.loading || !this.state.bleOpend}
                onPress={() => {
                  this._scan();
                }}
                title="Buscar"
              />
            </View>
            <Text style={styles.title}>
              Conectados:
              <Text style={{color: 'blue'}}>
                {!this.state.name
                  ? 'No hay dispositivos conectados'
                  : this.state.name}
              </Text>
            </Text>
            <Text style={styles.title}>Found(tap to connect):</Text>
            {this.state.loading ? (
              <View>
                <Text>
                  <ActivityIndicator />
                  cargando...
                </Text>
              </View>
            ) : (
              <View style={{flex: 1, flexDirection: 'column'}}>
                {this._renderRow(this.state.foundDs)}
              </View>
            )}
            <Text style={styles.title}>Emparejados:</Text>
            {this.state.loading ? <ActivityIndicator /> : null}
            <View style={{flex: 1, flexDirection: 'column'}}>
              {this._renderRow(this.state.pairedDs)}
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                paddingVertical: 30,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  paddingVertical: 30,
                }}>
                <Button
                  disabled={
                    this.state.loading ||
                    !(this.state.bleOpend && this.state.boundAddress.length > 0)
                  }
                  onPress={async () => {
                    await BluetoothEscposPrinter.printerInit();
                    await BluetoothEscposPrinter.printText(
                      'Print OKE !!!\r\n\r\n',
                      {},
                    );
                  }}
                  title="Test Print"
                />
              </View>
              <Text>separar</Text>
              <Button
                disabled={
                  this.state.loading ||
                  !(this.state.bleOpend && this.state.boundAddress.length > 0)
                }
                title="ESC/POS"
                onPress={() => {
                  this.props.navigator.push({
                    component: EscPos,
                    passProps: {
                      name: this.state.name,
                      boundAddress: this.state.boundAddress,
                    },
                  });
                }}
              />
              <Button
                disabled={
                  this.state.loading ||
                  !(this.state.bleOpend && this.state.boundAddress.length > 0)
                }
                title="TSC"
                onPress={() => {
                  this.props.navigator.push({
                    component: Tsc,
                    passProps: {
                      name: this.state.name,
                      boundAddress: this.state.boundAddress,
                    },
                  });
                }}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  _selfTest() {
    this.setState(
      {
        loading: true,
      },
      () => {
        BluetoothEscposPrinter.selfTest(() => {});

        this.setState({
          loading: false,
        });
      },
    );
  }
  _scan() {
    this.setState({
      loading: true,
    });
    BluetoothManager.scanDevices().then(
      (s) => {
        var ss = s;
        var found = ss.found;
        try {
          found = JSON.parse(found); //@FIX_it: the parse action too weired..
        } catch (e) {
          //ignore
        }
        var fds = this.state.foundDs;
        if (found && found.length) {
          fds = found;
        }
        this.setState({
          foundDs: fds,
          loading: false,
        });
      },
      (er) => {
        this.setState({
          loading: false,
        });
        alert('error' + JSON.stringify(er));
      },
    );
  }
}

const styles = StyleSheet.create({
  body: {
    margin: 30,
    alignContent: 'center',
  },
  sectionTitle: {
    alignContent: 'center',
    alignSelf: 'center',
    fontSize: 24,
    fontWeight: '900',
    color: '#0F00B8',
  },
  switchContainer: {
    alignSelf: 'center',
  },
  btn: {
    width: 200,
    marginTop: 40,
  },
  name: {
    fontWeight: 'bold',
  },
  title: {
    marginTop: 20,
  },
});
