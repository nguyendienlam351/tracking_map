import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Dimensions, PermissionsAndroid, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from 'react-native-geolocation-service';


const { width, height } = Dimensions.get('window')
const MAP_KEY = "AIzaSyAQdw23mRj6Bz7Dy1noAEM6p2Sx0IYBr3E"

const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.004;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const App = () => {
  const [state, setState] = useState({
    curLoc: { // Vị trí bắt đầu
      latitude: 10.801913,
      longitude: 106.764748,
    },
    droplocationCords: { // Vị trí kết thúc
      latitude: 10.815623,
      longitude: 106.780685,
    }
  })
  const { curLoc, droplocationCords } = state

  const mapRef = useRef()

  // Yêu cầu cấp quyền
  const locationPermission = () => new Promise(async (resolve, reject) => {
    if (Platform.OS === 'ios') {
      try {
        const permissionStatus = await Geolocation.requestAuthorization('whenInUse');
        if (permissionStatus === 'granted') {
          return resolve("granted");
        }
        reject('Permission not granted');
      } catch (error) {
        return reject(error);
      }
    }
    return PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ).then((granted) => {
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        resolve("granted");
      }
      return reject('Location Permission denied');
    }).catch((error) => {
      console.log('Ask Location permission error: ', error);
      return reject(error);
    });
  });

  // Lấy vị trí hiện tại
  const getCurrentPosition = () => {
    Geolocation.getCurrentPosition(
      position => {
        const cords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        setState({
          ...state,
          curLoc: cords
        })
      },
      error => {
        console.log(error.message);
      },
      {
        showLocationDialog: true,
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      },
    )
  }

  // Cập nhật vị trí hiện tại
  const getWatchPosition = () => {
    Geolocation.watchPosition(
      position => {
        const cords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        setState({
          ...state,
          curLoc: cords
        })
      },
      error => {
        console.log(error.message);
      },
      {
        showLocationDialog: true,
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
        distanceFilter: 0,
      },
    )
  }

  const getLiveLocation = async () => {
    const locPermissionDenied = await locationPermission()
    if (locPermissionDenied) {
      getCurrentPosition()
      getWatchPosition()
    }
  }

  useEffect(() => {
    getLiveLocation()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsUserLocation={true}
        showsMyLocationButton={true}
        zoomControlEnabled={true}
        provider={PROVIDER_GOOGLE}
        followsUserLocation={true}
        region={{
          ...curLoc,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
      >
        {/* <Marker
          ref={markerRef}
          coordinate={curLoc}
        /> */}
        <Marker
          coordinate={droplocationCords}
        />
        <MapViewDirections
          origin={curLoc}
          destination={droplocationCords}
          apikey={MAP_KEY}
          strokeWidth={5}
          strokeColor="skyblue"
          optimizeWaypoints={true}
          resetOnChange={false}
        />
      </MapView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

export default App;
