import React, { Component } from 'react'
import { Meteor } from 'meteor/meteor'
import { withTracker } from 'meteor/react-meteor-data'
import { withScriptjs, withGoogleMap, GoogleMap, Marker, InfoWindow } from 'react-google-maps'
import { SearchBox } from 'react-google-maps/lib/components/places/SearchBox'
import { MarkerClusterer } from 'react-google-maps/lib/components/addons/MarkerClusterer'
import { Input } from 'reactstrap'
import Events from '/imports/both/collections/events'
import mapOptions, { circle } from './mapOptions'
import EventInfo from './EventInfo'
import NewEvent from './NewEvent'
import EventsFilter from './EventsFilter'
import './styles.scss'

class MapComponent_ extends Component {
  constructor () {
    super()
    this.state = {
      events: [],
      bounds: null,
      center: { lat: 46, lng: -43 },
      zoom: 3,
      currentEventInfo: null,
      userLocation: null,
      ...this.getPositionFromDifferentRoute() // see below
    }
  }

  static getDerivedStateFromProps (nextProps) {
    return {
      events: nextProps.events
    }
  }

  render () {
    const {
      events,
      bounds,
      center,
      zoom,
      currentEventInfo,
      userLocation
    } = this.state

    return (
      <GoogleMap
        ref={ref => this.map = ref}
        center={center}
        zoom={zoom}
        defaultZoom={zoom}
        defaultOptions={mapOptions()}
      >
        <SearchBox
          ref={ref => this.searchBox = ref}
          bounds={bounds}
          controlPosition={google.maps.ControlPosition.TOP_LEFT}
          onPlacesChanged={this.handlePlaces}
        >
          <Input id='google-maps-searchbox' type="text" placeholder="Search" />
        </SearchBox>

        <MarkerClusterer
          onClick={this.onMarkerClustererClick}
          averageCenter
          enableRetinaIcons
          gridSize={60}
          maxZoom={8}
        >
          {events.map(event => {
            if (Meteor.isDevelopment && !event.address) { return } // react-hot-loader bug fix
            const fillColor = event.categories.length > 1 ? '#d09d7a' : event.categories[0].color

            return (
              <Marker
                key={event._id}
                position={{ lat: event.address.lat, lng: event.address.lng }}
                icon={{ ...circle, fillColor }}
                onClick={e => this.toggleInfoWindow(e, event._id)}
              >
                {currentEventInfo === event._id && (
                  <InfoWindow onCloseClick={() => this.toggleInfoWindow(null)}>
                    <EventInfo event={event} fillColor={fillColor} />
                  </InfoWindow>
                )}
              </Marker>
            )
          })}
        </MarkerClusterer>
        <NewEvent />
        <EventsFilter
          events={this.props.events} // pass events from props not state!
          onFiltersChanged={this.updateEventsAfterFilter}
        />
        {userLocation && (
          <Marker
            position={userLocation}
          />
        )}
      </GoogleMap>
    )
  }

  toggleInfoWindow = (e, _id) => {
    if (!e) {
      this.setState({ currentEventInfo: null })
    } else {
      this.setState({
        center: e.latLng.toJSON(),
        zoom: 18,
        currentEventInfo: _id
      })
    }
  }

  onMarkerClustererClick = () => {
    this.setState({ zoom: this.map.getZoom() })
  }

  updateEventsAfterFilter = events => {
    this.setState({ events })
  }

  /*
    handleBounds and handlePlaces code was taken from react-google-maps examples.
  */

  handleBounds = () => {
    this.setState({
      bounds: this.map.getBounds(),
      center: this.map.getCenter()
    })
  }

  handlePlaces = () => {
    const places = this.searchBox.getPlaces()
    const bounds = new window.google.maps.LatLngBounds()

    places.forEach(place => {
      if (place.geometry.viewport) {
        bounds.union(place.geometry.viewport)
      } else {
        bounds.extend(place.geometry.location)
      }
    })
    const nextMarkers = places.map(place => ({
      position: place.geometry.location
    }))
    const nextCenter = nextMarkers[0] ? nextMarkers[0].position : this.state.center

    this.setState({
      center: nextCenter,
      markers: nextMarkers
    })

    this.map.fitBounds(bounds)
  }

  getPositionFromDifferentRoute () {
    // Get position from a different component that redirects to the map

    const position = sessionStorage.getItem('position')
    if (position) {
      try {
        const { userLocation, ...coords } = JSON.parse(position)
        const center = {
          lng: parseFloat(coords.lng),
          lat: parseFloat(coords.lat)
        }
        return {
          center,
          zoom: 7, // we want to only search in the local area
          userLocation: userLocation ? center : null
        }
      } catch (ex) { /* fail silently */ }

      sessionStorage.removeItem('position')
    }
  }
}
const MapComponent = withScriptjs(withGoogleMap(MapComponent_))

class Map_ extends Component {
  render () {
    const { key } = Meteor.settings.public.gm
    const url = 'https://maps.googleapis.com/maps/api/js?key=' + key + '&v=3.exp&libraries=places'

    return (
      <MapComponent
        googleMapURL={!window.google ? url : '-'}
        loadingElement={<div style={{ height: '100%' }} />}
        containerElement={<div id='map-container' />}
        mapElement={<div id='map' />}
        events={this.props.events}
      />
    )
  }
}

export default withTracker(() => {
  Meteor.subscribe('Events.getEvents')

  return {
    events: Events.find({}).fetch()
  }
})(Map_)
