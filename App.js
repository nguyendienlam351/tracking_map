import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Dimensions,
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
  Alert,
  View,
  Linking,
  Image
} from 'react-native';
import MapView, { Marker, AnimatedRegion, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from 'react-native-geolocation-service';


const { width, height } = Dimensions.get('window')
const MAP_KEY = "AIzaSyAQdw23mRj6Bz7Dy1noAEM6p2Sx0IYBr3E"
const compassImage = require("./images/compass.png")
const carImage = require("./images/car.png")
const ASPECT_RATIO = width / height
const LATITUDE_DELTA = 0.004
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO

const App = () => {
  const [location, setLocation] = useState({
    curLoc: { // Vị trí bắt đầu
      latitude: 0,
      longitude: 0,
    },
    coordinate: new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA
    }),
    heading: 0,
  })

  const [remain, setRemain] = useState({
    distance: 0, // Quảng đường còn lại
    duration: 0, // Thời gian còn lại
  })

  const { curLoc, heading, coordinate } = location
  const [isFollowUser, setIsFollowUser] = useState(true)
  const markerRef = useRef()

  // Vị trí kết thúc
  const [droplocationCords, setdroplocationCords] = useState({
    latitude: 0,
    longitude: 0,
  })

  // Yêu cầu cấp quyền
  const locationPermission = () => new Promise(async (resolve, reject) => {
    if (Platform.OS === 'ios') {
      try {
        const permissionStatus = await Geolocation.requestAuthorization('whenInUse');
        if (permissionStatus === 'granted') {
          return resolve("granted")
        }
        reject('Permission not granted')
      } catch (error) {
        return reject(error)
      }
    }
    return PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ).then((granted) => {
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        resolve("granted");
      }
      return reject('Location Permission denied')
    }).catch((error) => {
      console.log('Ask Location permission error: ', error)
      return reject(error)
    })
  })

  // Lấy vị trí hiện tại
  const getCurrentPosition = () => {
    Geolocation.getCurrentPosition(
      position => {
        const cords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setLocation({
          ...location,
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

  const animate = (latitude, longitude) => {
    const newCoordinate = { latitude, longitude };
    if (Platform.OS == 'android') {
      if (markerRef.current) {
        markerRef.current.animateMarkerToCoordinate(newCoordinate, 500);
      }
    } else {
      coordinate.timing(newCoordinate).start();
    }
  }

  // Cập nhật vị trí hiện tại
  const getWatchPosition = () => {
    Geolocation.watchPosition(
      position => {
        const cords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        const heading = position.coords.heading

        animate(cords.latitude, cords.longitude)
        setLocation({
          curLoc: cords,
          heading: heading,
          coordinate: new AnimatedRegion({
            latitude: cords.latitude,
            longitude: cords.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA
          })
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

  const setDroplocation = (coordinate) => {
    Alert.alert(
      "Thông báo",
      "Bắt đầu chỉ đường",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "OK", onPress: () => {
            setdroplocationCords(coordinate)
          }
        }
      ]
    )
  }

  const getLiveLocation = async () => {
    const locPermissionDenied = await locationPermission()
    if (locPermissionDenied) {
      getWatchPosition()
    }
  }

  // Chuyển sang google map
  const handleNavigateGoogleMap = async () => {
    const url = "https://www.google.com/maps/dir/?api=1"
      + "&origin=" + curLoc.latitude + "," + curLoc.longitude
      + "&destination=" + droplocationCords.latitude + "," + droplocationCords.longitude
      + "&dir_action=navigate&travelmode=driving"

    const supported = await Linking.canOpenURL(url)

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(`Don't know how to open this URL: ${url}`)
    }
  }

  useEffect(() => {
    getLiveLocation()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        showsMyLocationButton={true}
        zoomControlEnabled={true}
        provider={PROVIDER_GOOGLE}
        followsUserLocation={isFollowUser}
        region={isFollowUser ? {
          ...curLoc,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        } : null}
        onRegionChange={(Region, isGesture) => {
          // Nếu lướt trên map sẽ tắt follow theo vị trí user
          if (isGesture.isGesture) {
            setIsFollowUser(false)
          }
        }}
        onLongPress={(event) => {
          const { coordinate } = event.nativeEvent
          setDroplocation(coordinate)
        }}
      >
        {/* Vị trí hiện tại */}
        <Marker.Animated
          ref={markerRef}
          rotation={-15}
          anchor={{ x: 0.5, y: 0.5 }}
          coordinate={coordinate}
          style={{
            transform: [{ rotate: `${heading}deg` }]
          }}
        >
          <Image source={carImage} style={[styles.image]} />
        </Marker.Animated>
        {
          (droplocationCords.latitude !== 0 && droplocationCords.longitude !== 0) &&
          <>
            {/* Vị trí đến */}
            <Marker
              coordinate={droplocationCords}
            />

            <MapViewDirections
              origin={curLoc}
              destination={droplocationCords}
              apikey={MAP_KEY}
              strokeWidth={5}
              strokeColor="#E85626"
              optimizeWaypoints={true}
              resetOnChange={false}
              onReady={({ distance, duration }) => {
                setRemain({
                  distance: distance,
                  duration: duration
                })
              }}
            />
          </>
        }
      </MapView>

      <View style={[styles.view, { top: 20, alignSelf: "center" }]}>
        <Text style={styles.text}>
          {`Khoảng cách còn lại: ${remain.distance.toFixed(1)} km\nThời gian còn lại: ${remain.duration.toFixed(0)} phút`}
        </Text>
      </View>

      {
        (droplocationCords.latitude !== 0 && droplocationCords.longitude !== 0) &&
        <TouchableOpacity
          style={[styles.view, { left: 20, bottom: 20 }]}
          onPress={() => handleNavigateGoogleMap()} >
          <Image source={compassImage} style={styles.image} />
        </TouchableOpacity>
      }

      <TouchableOpacity
        onPress={() => setIsFollowUser(true)}
        style={[styles.view, { bottom: 20, alignSelf: "center" }]}>
        <Text style={styles.text}>Về Giữa</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  view: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 15,
    borderWidth: 1
  },
  text: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontWeight: "700",
    color: "black",
    fontSize: 15
  },
  image: {
    height: 25,
    width: 25,
    margin: 10
  }
});

export default App;
